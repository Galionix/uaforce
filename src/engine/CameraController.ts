import { FreeCamera, Mesh, Ray, Scene, Vector3 } from '@babylonjs/core';

export class CameraController {

    private _scene:Scene;
    private _camera: FreeCamera;
    groundMesh?:Mesh;

    // Camera impulse system
    private defaultPosition: Vector3 = new Vector3(0, 0, 5); // Higher Y, further Z
    private currentOffset: Vector3 = Vector3.Zero();
    private targetOffset: Vector3 = Vector3.Zero();
    private lerpSpeed: number = 8.0; // How fast camera returns to default position
    private dampening: number = 0.85; // How much impulse decays each frame

    // Player following
    private playerMesh?: Mesh;
    private followOffset: Vector3 = new Vector3(0, 0, 5); // Camera offset from player (higher Y)
    private cameraLerpSpeed: number = 5.0; // How fast camera follows player

    public setGroundMesh(ground: Mesh){
        this.groundMesh = ground;
        // Note: Ground mesh collision detection can be added here if needed
        // Currently focusing on camera impulse system
    }

    public setPlayerMesh(playerMesh: Mesh): void {
        this.playerMesh = playerMesh;

        // Set initial camera position based on player spawn position
        const playerPos = playerMesh.position;
        const initialCameraPosition = new Vector3(playerPos.x, playerPos.y + 0.5, playerPos.z + 8);

        // Update follow offset to be much lower and further back
        this.followOffset = new Vector3(0, 1.5, 8); // Only 0.5 units above, 8 units back

        // Set initial camera position
        this._camera.position = initialCameraPosition.clone();

        // Set a FIXED target that never changes (2D platformer - no rotation)
        const fixedTarget = new Vector3(playerPos.x, playerPos.y, playerPos.z);
        // this._camera.setTarget(fixedTarget);

        // Disable camera controls to prevent any rotation
        this._camera.inputs.clear();

        console.log(`Camera initialized - Player at: ${playerPos.toString()}, Camera at: ${initialCameraPosition.toString()}`);
    }
    constructor(canvas: HTMLCanvasElement, scene: Scene) {
        this._scene = scene;

        // Start with a default position, will be updated when player mesh is set
        this._camera = new FreeCamera('camera', new Vector3(0, 0, 0), scene);
        // this._camera.maxZ = 100;
        // this._camera.lowerRadiusLimit = 20;
        // this._camera.upperRadiusLimit = 20;

        // Register camera impulse update loop
        this._scene.registerBeforeRender(() => {
            this.updateCameraImpulse();
        });
    }
    get camera() {
        return this._camera;
    }

    // Update camera impulse system each frame
    private updateCameraImpulse(): void {
        // Follow player position if set
        if (this.playerMesh) {
            const playerPosition = this.playerMesh.position;

            // Calculate desired camera position relative to player
            const desiredCameraPosition = playerPosition.add(this.followOffset);

            // Apply impulse effects to the desired position
            const impulseEffectedPosition = desiredCameraPosition.add(this.currentOffset);

            // Smoothly lerp camera position towards the desired position
            this._camera.position = Vector3.Lerp(
                this._camera.position,
                impulseEffectedPosition,
                this.cameraLerpSpeed * this._scene.getEngine().getDeltaTime() / 1000
            );

            // Update target to follow player X and Y, but maintain same Z relationship (no rotation)
            const followingTarget = new Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
            // this._camera.setTarget(followingTarget);

            // Apply dampening to current offset
            this.currentOffset.scaleInPlace(this.dampening);

            // Lerp current offset towards target offset
            this.currentOffset = Vector3.Lerp(this.currentOffset, this.targetOffset, this.lerpSpeed * this._scene.getEngine().getDeltaTime() / 1000);

            // Decay target offset towards zero
            this.targetOffset.scaleInPlace(this.dampening);

            // Reset very small values to prevent infinite tiny movements
            if (this.currentOffset.length() < 0.001) {
                this.currentOffset = Vector3.Zero();
            }
            if (this.targetOffset.length() < 0.001) {
                this.targetOffset = Vector3.Zero();
            }
        }
    }

    // Apply camera impulse for various actions
    public applyImpulse(direction: Vector3, strength: number = 1.0): void {
        const impulse = direction.scale(strength);
        this.targetOffset = this.targetOffset.add(impulse);
    }

    // Predefined impulse effects for common actions
    public landingImpact(strength: number = 1.0): void {
        console.log(`Camera landing impact triggered with strength: ${strength.toFixed(2)}`);
        // Strong downward motion for landing impact
        this.applyImpulse(new Vector3(0, -1.5, 0), strength);
        setTimeout(() => {
            // Smaller upward bounce after impact
            this.applyImpulse(new Vector3(0, 0.5, 0), strength * 0.3);
        }, 100);
    }

    public wallJumpShake(direction: number, strength: number = 1.0): void {
        // Horizontal shake when wall jumping
        // direction: -1 for left wall, 1 for right wall
        this.applyImpulse(new Vector3(direction * 0.2, 0.1, 0), strength);
    }

    public jumpImpulse(strength: number = 0.8): void {
        // Slight upward motion when jumping
        this.applyImpulse(new Vector3(0, 0.15, 0), strength);
    }

    public dashImpulse(direction: Vector3, strength: number = 1.2): void {
        // Sharp movement in dash direction
        this.applyImpulse(direction.scale(0.25), strength);
    }

    public hitImpact(direction: Vector3, strength: number = 1.5): void {
        // Impact when player takes damage
        this.applyImpulse(direction.scale(0.4), strength);
    }

    // Camera shake for explosions or strong impacts
    public screenShake(intensity: number = 1.0, duration: number = 300): void {
        const shakeCount = Math.floor(duration / 16); // ~60fps
        let currentShake = 0;

        const shakeInterval = setInterval(() => {
            if (currentShake >= shakeCount) {
                clearInterval(shakeInterval);
                return;
            }

            const randomX = (Math.random() - 0.5) * 0.3 * intensity;
            const randomY = (Math.random() - 0.5) * 0.3 * intensity;
            this.applyImpulse(new Vector3(randomX, randomY, 0), 1.0);

            currentShake++;
        }, 16);
    }

    // Configuration methods
    public setLerpSpeed(speed: number): void {
        this.lerpSpeed = speed;
    }

    public setDampening(dampening: number): void {
        this.dampening = Math.max(0, Math.min(1, dampening)); // Clamp between 0-1
    }

    public setDefaultPosition(position: Vector3): void {
        this.defaultPosition = position.clone();
        this.followOffset = position.clone(); // Update follow offset too
    }

    public setFollowOffset(offset: Vector3): void {
        this.followOffset = offset.clone();
    }

    public setCameraLerpSpeed(speed: number): void {
        this.cameraLerpSpeed = speed;
    }

    // Test function to try different camera effects
    // public testCameraEffects(): void {
    //     console.log("Testing camera effects...");

    //     // Test landing impact
    //     setTimeout(() => {
    //         console.log("Landing impact test");
    //         this.landingImpact(1.5);
    //     }, 1000);

    //     // Test wall jump shake
    //     setTimeout(() => {
    //         console.log("Wall jump shake test");
    //         this.wallJumpShake(-1, 1.2);
    //     }, 2000);

    //     // Test jump impulse
    //     setTimeout(() => {
    //         console.log("Jump impulse test");
    //         this.jumpImpulse(1.0);
    //     }, 3000);

    //     // Test screen shake
    //     setTimeout(() => {
    //         console.log("Screen shake test");
    //         this.screenShake(1.5, 500);
    //     }, 4000);
    // }

}