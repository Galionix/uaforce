import {
    HavokPlugin, Mesh, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsRaycastResult,
    PhysicsShapeType, Scene, Vector3, Ray, RayHelper
} from '@babylonjs/core';

import { SoundController } from './SoundController';
import Logger from '../utils/logger';
import { SceneController } from './SceneController';

export class PlayerController {
    // position: Vector3;
    playerMesh: Mesh;
    propsFromBlender: any
    scene: Scene
    _aggregate?: PhysicsAggregate;
    hk: HavokPlugin
    soundController: SoundController
    weaponCooldown: number // ms

    _groundColliderMesh?: Mesh
    footRaycast = new PhysicsRaycastResult();

    // Unified downward ray system for ground and death detection
    private _downwardRay?: Ray;
    private _downwardRayHelper?: RayHelper;
    private _rayLength: number = 3.0; // How far down to check
    private _rayOffset: Vector3 = new Vector3(0, 0, 0.4); // Offset from player center
    private _groundDetectionSphere?: Mesh; // Visual indicator for ground detection

    // Ground detection state
    private _lastGroundHit: {
        hit: boolean;
        point: Vector3 | null;
        distance: number;
    } = { hit: false, point: null, distance: 0 };

    // Death and respawn system
    private _lives: number = 3;
    private _initialSpawnPosition: Vector3 = Vector3.Zero();
    private _initialSpawnProps: any = null;
    private _isDead: boolean = false;
    sceneController: SceneController;
    constructor(scene: Scene, hk: HavokPlugin, soundController: SoundController, sceneController: SceneController) {
        this.playerMesh = this.drawPlayerModel()
        this.soundController = soundController
        this.scene = scene
        this.hk = hk
        this.weaponCooldown = 0 // Initialize cooldown to 0
        this.sceneController = sceneController;
    }
    get canShoot(){
        return this.weaponCooldown < 1
    }
    set weaponCD(cd: number){
        this.weaponCooldown = cd
    }


    startCooldown(){
        // here we need to asynchronously update our cooldown, each 10 ms
        const updateCooldown = () => {
            if (this.weaponCooldown > 0) {
                this.weaponCooldown -= 10;
                setTimeout(updateCooldown, 10);
            }
        };
        setTimeout(updateCooldown, 10);
    }

    shoot() {
        if (this.canShoot) {

            this.sceneController.projectileController.fireProjectile()
            this.weaponCD = 1000; // Set cooldown to 300ms after shooting
            // this.soundController.playGunshot();
            this.startCooldown();
        }
    }

    get aggregate() {
        if(!this._aggregate) console.error("this shouldnt happen but actual aggregate undefined")
        return this._aggregate || new PhysicsAggregate(this.playerMesh, PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0.75 }, this.scene);
    }

    // Deprecated: Use the new movement control methods instead
    // Kept for backward compatibility during transition
    /** @deprecated Use setVelocity() and getVelocity() instead */
    get physicsBody() {
        return this._aggregate?.body;
    }

    private setupUnifiedRayDetection() {
        if (!this._aggregate) return;

        // Create unified downward ray for both ground and death detection
        const rayOrigin = Vector3.Zero(); // Will be updated each frame
        const rayDirection = new Vector3(0, -1, 0); // Downward
        this._downwardRay = new Ray(rayOrigin, rayDirection);

        // Create visual ray helper for debugging (can be disabled in production)
        this._downwardRayHelper = new RayHelper(this._downwardRay);

        // Create ground detection visual sphere
        this._groundDetectionSphere = MeshBuilder.CreateSphere("groundDetector", { diameter: 0.15 }, this.scene);
        this._groundDetectionSphere.setEnabled(false);

        // Attach ray helper to player mesh for automatic position updates
        this._downwardRayHelper.attachToMesh(
            this.playerMesh,
            rayDirection,
            this._rayOffset,
            this._rayLength
        );

        // Show the ray for debugging (comment out in production)
        this._downwardRayHelper.show(this.scene);

        // Set up frame-by-frame detection
        this.scene.onBeforeRenderObservable.add(() => {
            this.performUnifiedRaycast();
        });

        Logger.general.debug("Unified ray detection setup completed");
    }

    private performUnifiedRaycast(): void {
        if (!this._downwardRay || this._isDead) return;

        // Update ray origin to player's current position + offset
        const playerPosition = this.getPosition();
        this._downwardRay.origin = playerPosition.add(this._rayOffset);

        // Get all meshes that have collideable metadata (for ground detection)
        const collideableMeshes = this.scene.meshes.filter(mesh => {
            return mesh.metadata?.gltf?.extras?.collideable === true;
        });

        // Get death plane meshes
        const deathPlaneMeshes = this.scene.meshes.filter(mesh => {
            return mesh.name === 'death plane' || mesh.metadata?.gltf?.extras?.deathPlane === true;
        });

        // Check for ground collision
        if (collideableMeshes.length > 0) {
            const groundHitInfo = this._downwardRay.intersectsMeshes(collideableMeshes);

            if (groundHitInfo.length > 0 && groundHitInfo[0].pickedPoint) {
                // Ground detected - show sphere and set ground state
                this._groundDetectionSphere?.setEnabled(true);
                this._groundDetectionSphere?.position.copyFrom(groundHitInfo[0].pickedPoint);

                // This will be used by the input controller for onGround state
                this._lastGroundHit = {
                    hit: true,
                    point: groundHitInfo[0].pickedPoint,
                    distance: Vector3.Distance(playerPosition, groundHitInfo[0].pickedPoint)
                };
            } else {
                // No ground detected
                this._groundDetectionSphere?.setEnabled(false);
                this._lastGroundHit = { hit: false, point: null, distance: 0 };
            }
        }

        // Check for death plane
        if (deathPlaneMeshes.length > 0) {
            const deathHitInfo = this._downwardRay.intersectsMeshes(deathPlaneMeshes);

            if (deathHitInfo.length > 0 && deathHitInfo[0].pickedPoint) {
                const distance = Vector3.Distance(playerPosition, deathHitInfo[0].pickedPoint);

                // Check if player is within death detection range
                if (distance <= this._rayLength) {
                    const hitMesh = deathHitInfo[0].pickedMesh;
                    if (hitMesh && (hitMesh.name === 'death plane' || hitMesh.metadata?.gltf?.extras?.deathPlane === true)) {
                        Logger.general.info(`Player detected death plane below at distance: ${distance.toFixed(2)}`);
                        this.handleDeath();
                    }
                }
            }
        }
    }

    setInitialPosition(position: Vector3, props: any) {
        // Store initial spawn data for respawning
        this._initialSpawnPosition = position.clone();
        this._initialSpawnProps = props;

        this.propsFromBlender = props
        const playerAggregate = new PhysicsAggregate(this.playerMesh, PhysicsShapeType.CAPSULE, {
            friction: 1,
            mass: 10, restitution: 0.1, center: new Vector3(0, -2, 0)
        }, this.scene);
        this.playerMesh.checkCollisions = true;
        this._aggregate = playerAggregate
        this._aggregate.body.disablePreStep = false;
        this.aggregate.body.setMassProperties({
            mass: 10,
            inertia: new Vector3(1000, 1000, 1000), // High inertia to resist rotation
            centerOfMass: new Vector3(0, -1, 0),
        })
        this._aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.hk.setAngularDamping( this._aggregate.body,Number.MAX_SAFE_INTEGER);

        // Note: 2D physics constraints are now handled globally by Physics2DConstraintSystem
        // Manually register the player's physics body with the constraint system
        // This is done after a short delay to ensure the aggregate is fully set up
        setTimeout(() => {
            const sceneController = this.scene.metadata?.sceneController;
            if (sceneController && sceneController.physics2DConstraintSystem && this._aggregate) {
                sceneController.physics2DConstraintSystem.registerPhysicsBody(this._aggregate.body, 'Player');
            }
        }, 100);

        // Set up unified ray detection for ground and death plane
        this.setupUnifiedRayDetection();

        // Set initial facing direction - start with no rotation to debug
        this.playerMesh.rotation = new Vector3(0, 0, 0); // No rotation initially

    }

    drawPlayerModel() {
        const player = MeshBuilder.CreateCapsule("box");
        const groundCollider = MeshBuilder.CreateBox("ground detect")
        const nose = MeshBuilder.CreateBox("nose", {
            width: 0.5,
            size: 0.2,
        })
        // Position nose clearly to one side for testing
        nose.position = new Vector3(-1, 0.5, 0) // Flip to the opposite side
        nose.parent = player
        groundCollider.position.y = -0.5;
        groundCollider.parent = player
        groundCollider.showBoundingBox = true;
        groundCollider.isVisible = false
        this._groundColliderMesh = groundCollider
        player.position.y = 10
        player.showBoundingBox = true;

        // Start with no rotation to see which side the nose is on
        player.rotation.y = 0; // No rotation initially to debug

        return player
    }

    get mesh() {
        return this.playerMesh
    }

    get groundColliderMesh() {
        return this._groundColliderMesh;
    }

    // === MOVEMENT CONTROL METHODS ===

    /**
     * Set the player's velocity
     */
    public setVelocity(velocity: Vector3): void {
        if (!this._aggregate) {
            Logger.physics.error("Cannot set velocity: Physics aggregate not initialized");
            return;
        }

        // Ensure Z component is always 0 for 2D movement
        const constrainedVelocity = new Vector3(velocity.x, velocity.y, 0);
        this._aggregate.body.setLinearVelocity(constrainedVelocity);

        // Lock angular velocity to prevent unwanted rotation
        this._aggregate.body.setAngularVelocity(Vector3.Zero());
    }

    /**
     * Get the player's current velocity
     */
    public getVelocity(): Vector3 {
        if (!this._aggregate) {
            Logger.physics.error("Cannot get velocity: Physics aggregate not initialized");
            return Vector3.Zero();
        }
        return this._aggregate.body.getLinearVelocity();
    }

    /**
     * Set the player's facing direction based on movement input
     */
    public setFacingDirection(facingLeft: boolean): void {
        if (facingLeft) {
            // Face left (positive X direction in our coordinate system)
            this.playerMesh.rotation.y = Math.PI;
        } else {
            // Face right (negative X direction in our coordinate system)
            this.playerMesh.rotation.y = 0;
        }
        Logger.physics.debug(`Player facing direction set to: ${facingLeft ? 'left' : 'right'}`);
    }

    /**
     * Get the player's current facing direction
     */
    public getFacingDirection(): boolean {
        // Player faces left when rotation.y is PI (180 degrees)
        return Math.abs(this.playerMesh.rotation.y - Math.PI) < 0.1;
    }

    /**
     * Get the player's current position
     */
    public getPosition(): Vector3 {
        return this.playerMesh.position.clone();
    }

    /**
     * Set the player's position (useful for teleporting/respawning)
     */
    public setPosition(position: Vector3): void {
        // Ensure Z position is always 0 for 2D movement
        const constrainedPosition = new Vector3(position.x, position.y, 0);
        this.playerMesh.position = constrainedPosition;
        Logger.physics.debug(`Player position set to: ${constrainedPosition.toString()}`);
    }

    /**
     * Get debug information about the player's current state
     */
    public getDebugInfo(): {
        position: Vector3;
        velocity: Vector3;
        rotation: Vector3;
        hasPhysics: boolean;
    } {
        return {
            position: this.getPosition(),
            velocity: this.getVelocity(),
            rotation: this.playerMesh.rotation.clone(),
            hasPhysics: !!this._aggregate
        };
    }

    // === DEATH AND RESPAWN SYSTEM ===

    /**
     * Handle player death when touching death plane
     */
    public handleDeath(): void {
        if (this._isDead) return; // Prevent multiple death triggers

        this._isDead = true;
        this._lives--;

        Logger.general.info(`Player died! Lives remaining: ${this._lives}`);

        // Play death sound
        this.soundController.playDeath();

        if (this._lives > 0) {
            // Respawn player
            this.respawn();
        } else {
            // Game over
            this.handleGameOver();
        }
    }

    /**
     * Respawn player at initial spawn position
     */
    public respawn(): void {
        Logger.general.info(`Respawning player at: ${this._initialSpawnPosition.toString()}`);

        // Reset player position
        this.setPosition(this._initialSpawnPosition);

        // Reset velocity to stop any movement
        this.setVelocity(Vector3.Zero());

        // Reset death state
        this._isDead = false;

        // Play spawn sound
        this.soundController.playSpawn();

        // Could add respawn effects here later
        Logger.general.info("Player respawned successfully");
    }

    /**
     * Handle game over when all lives are lost
     */
    public handleGameOver(): void {
        Logger.general.info("Game Over! All lives lost.");

        // Reset lives for future games
        this._lives = 3;

        // For now, just respawn - later we can show game over screen
        this.respawn();

        // TODO: Show game over screen, restart level, etc.
    }

    /**
     * Get current number of lives
     */
    public getLives(): number {
        return this._lives;
    }

    /**
     * Get death state
     */
    public isDead(): boolean {
        return this._isDead;
    }

    /**
     * Reset lives (useful for new game/level restart)
     */
    public resetLives(lives: number = 3): void {
        this._lives = lives;
        this._isDead = false;
        Logger.general.info(`Lives reset to: ${this._lives}`);
    }

    /**
     * Display current lives (temporary method for debugging)
     */
    public displayLives(): void {
        Logger.general.info(`❤️ Lives remaining: ${this._lives}`);
    }

    // === RAY DETECTION CONFIGURATION ===

    /**
     * Set the ray detection distance
     */
    public setRayLength(length: number): void {
        this._rayLength = Math.max(0.1, length); // Minimum 0.1 units
        Logger.general.debug(`Ray detection length set to: ${this._rayLength}`);
    }

    /**
     * Get the current ray detection length
     */
    public getRayLength(): number {
        return this._rayLength;
    }

    /**
     * Toggle ray visualization (for debugging)
     */
    public toggleRayVisualization(show: boolean): void {
        if (!this._downwardRayHelper) return;

        if (show) {
            this._downwardRayHelper.show(this.scene);
            Logger.general.debug("Ray visualization enabled");
        } else {
            this._downwardRayHelper.hide();
            Logger.general.debug("Ray visualization disabled");
        }
    }

    /**
     * Get ground detection state (for use by InputController)
     */
    public getGroundDetectionState(): {
        isOnGround: boolean;
        groundPoint: Vector3 | null;
        distance: number;
    } {
        return {
            isOnGround: this._lastGroundHit.hit && this._lastGroundHit.distance <= 0.7, // Use same threshold as before
            groundPoint: this._lastGroundHit.point,
            distance: this._lastGroundHit.distance
        };
    }

}