import { FreeCamera, Mesh, Ray, Scene, Vector3 } from '@babylonjs/core';

// Camera configuration constants
const CAMERA_CONFIG = {
    // Follow settings
    FOLLOW_HEIGHT: 1.5,           // Units above player
    FOLLOW_DISTANCE: 20,           // Units behind player (Z offset)
    FOLLOW_LERP_SPEED: 5.0,       // How fast camera follows player

    // Impulse system settings
    IMPULSE_LERP_SPEED: 8.0,      // How fast impulses decay
    IMPULSE_DAMPENING: 0.85,      // Impulse decay multiplier per frame
    MIN_IMPULSE_THRESHOLD: 0.001, // Minimum impulse before reset to zero

    // Landing impact settings
    LANDING_IMPACT_DOWN: -1.5,    // Downward impulse strength
    LANDING_IMPACT_UP: 0.5,       // Upward bounce strength
    LANDING_BOUNCE_DELAY: 100,    // Delay before bounce (ms)
    LANDING_BOUNCE_MULTIPLIER: 0.3, // Bounce strength relative to impact

    // Other impulse effects
    JUMP_IMPULSE: 0.15,           // Upward impulse when jumping
    WALL_JUMP_HORIZONTAL: 0.2,    // Horizontal shake for wall jumps
    WALL_JUMP_VERTICAL: 0.1,      // Vertical shake for wall jumps
    SCREEN_SHAKE_MULTIPLIER: 0.3, // Screen shake intensity multiplier
    SCREEN_SHAKE_FPS: 16,         // Screen shake update interval (ms)
};

export class CameraController {
    private _scene: Scene;
    private _camera: FreeCamera;
    private groundMesh?: Mesh;

    // Camera impulse system
    private currentOffset: Vector3 = Vector3.Zero();
    private targetOffset: Vector3 = Vector3.Zero();

    // Player following
    private playerMesh?: Mesh;
    private followOffset: Vector3 = Vector3.Zero();

    // Configuration (can be modified at runtime)
    private config = {
        followLerpSpeed: CAMERA_CONFIG.FOLLOW_LERP_SPEED,
        impulseLerpSpeed: CAMERA_CONFIG.IMPULSE_LERP_SPEED,
        dampening: CAMERA_CONFIG.IMPULSE_DAMPENING,
    };

    constructor(canvas: HTMLCanvasElement, scene: Scene) {
        this._scene = scene;

        // Start with a default position, will be updated when player mesh is set
        this._camera = new FreeCamera('camera', new Vector3(0, 0, 0), scene);

        // Register camera impulse update loop
        this._scene.registerBeforeRender(() => {
            this.updateCameraImpulse();
        });
    }

    get camera() {
        return this._camera;
    }

    public setGroundMesh(ground: Mesh): void {
        this.groundMesh = ground;
        // Note: Ground mesh collision detection can be added here if needed
        // Currently focusing on camera impulse system
    }

    public setPlayerMesh(playerMesh: Mesh): void {
        this.playerMesh = playerMesh;

        // Set initial camera position based on player spawn position
        const playerPos = playerMesh.position;
        const initialCameraPosition = new Vector3(
            playerPos.x,
            playerPos.y + CAMERA_CONFIG.FOLLOW_HEIGHT,
            playerPos.z + CAMERA_CONFIG.FOLLOW_DISTANCE
        );

        // Update follow offset using constants
        this.followOffset = new Vector3(0, CAMERA_CONFIG.FOLLOW_HEIGHT, CAMERA_CONFIG.FOLLOW_DISTANCE);

        // Set initial camera position
        this._camera.position = initialCameraPosition.clone();

        // Disable camera controls to prevent any rotation
        this._camera.inputs.clear();

        console.log(`Camera initialized - Player at: ${playerPos.toString()}, Camera at: ${initialCameraPosition.toString()}`);
    }

    // Update camera impulse system each frame
    private updateCameraImpulse(): void {
        if (!this.playerMesh) return;

        const playerPosition = this.playerMesh.position;
        const deltaTime = this._scene.getEngine().getDeltaTime() / 1000;

        // Calculate desired camera position relative to player
        const desiredCameraPosition = playerPosition.add(this.followOffset);
        const impulseEffectedPosition = desiredCameraPosition.add(this.currentOffset);

        // Smoothly lerp camera position towards the desired position
        this._camera.position = Vector3.Lerp(
            this._camera.position,
            impulseEffectedPosition,
            this.config.followLerpSpeed * deltaTime
        );

        // Apply impulse physics
        this.updateImpulsePhysics(deltaTime);
    }

    private updateImpulsePhysics(deltaTime: number): void {
        // Apply dampening to current offset
        this.currentOffset.scaleInPlace(this.config.dampening);

        // Lerp current offset towards target offset
        this.currentOffset = Vector3.Lerp(
            this.currentOffset,
            this.targetOffset,
            this.config.impulseLerpSpeed * deltaTime
        );

        // Decay target offset towards zero
        this.targetOffset.scaleInPlace(this.config.dampening);

        // Reset very small values to prevent infinite tiny movements
        if (this.currentOffset.length() < CAMERA_CONFIG.MIN_IMPULSE_THRESHOLD) {
            this.currentOffset = Vector3.Zero();
        }
        if (this.targetOffset.length() < CAMERA_CONFIG.MIN_IMPULSE_THRESHOLD) {
            this.targetOffset = Vector3.Zero();
        }
    }

    // Apply camera impulse for various actions
    public applyImpulse(direction: Vector3, strength: number = 1.0): void {
        const impulse = direction.scale(strength);
        this.targetOffset = this.targetOffset.add(impulse);
    }

    // === PREDEFINED IMPULSE EFFECTS ===

    public landingImpact(strength: number = 1.0): void {
        console.log(`Camera landing impact triggered with strength: ${strength.toFixed(2)}`);

        // Strong downward motion for landing impact
        this.applyImpulse(new Vector3(0, CAMERA_CONFIG.LANDING_IMPACT_DOWN, 0), strength);

        // Delayed upward bounce
        setTimeout(() => {
            this.applyImpulse(
                new Vector3(0, CAMERA_CONFIG.LANDING_IMPACT_UP, 0),
                strength * CAMERA_CONFIG.LANDING_BOUNCE_MULTIPLIER
            );
        }, CAMERA_CONFIG.LANDING_BOUNCE_DELAY);
    }

    public wallJumpShake(direction: number, strength: number = 1.0): void {
        // Horizontal shake when wall jumping (direction: -1 for left wall, 1 for right wall)
        this.applyImpulse(
            new Vector3(direction * CAMERA_CONFIG.WALL_JUMP_HORIZONTAL, CAMERA_CONFIG.WALL_JUMP_VERTICAL, 0),
            strength
        );
    }

    public jumpImpulse(strength: number = 0.8): void {
        // Slight upward motion when jumping
        this.applyImpulse(new Vector3(0, CAMERA_CONFIG.JUMP_IMPULSE, 0), strength);
    }

    public dashImpulse(direction: Vector3, strength: number = 1.2): void {
        // Sharp movement in dash direction
        this.applyImpulse(direction.scale(0.25), strength);
    }

    public hitImpact(direction: Vector3, strength: number = 1.5): void {
        // Impact when player takes damage
        this.applyImpulse(direction.scale(0.4), strength);
    }

    public screenShake(intensity: number = 1.0, duration: number = 300): void {
        const shakeCount = Math.floor(duration / CAMERA_CONFIG.SCREEN_SHAKE_FPS);
        let currentShake = 0;

        const shakeInterval = setInterval(() => {
            if (currentShake >= shakeCount) {
                clearInterval(shakeInterval);
                return;
            }

            const randomX = (Math.random() - 0.5) * CAMERA_CONFIG.SCREEN_SHAKE_MULTIPLIER * intensity;
            const randomY = (Math.random() - 0.5) * CAMERA_CONFIG.SCREEN_SHAKE_MULTIPLIER * intensity;
            this.applyImpulse(new Vector3(randomX, randomY, 0), 1.0);

            currentShake++;
        }, CAMERA_CONFIG.SCREEN_SHAKE_FPS);
    }

    // === CONFIGURATION METHODS ===

    public setLerpSpeed(speed: number): void {
        this.config.impulseLerpSpeed = speed;
    }

    public setDampening(dampening: number): void {
        this.config.dampening = Math.max(0, Math.min(1, dampening)); // Clamp between 0-1
    }

    public setFollowOffset(offset: Vector3): void {
        this.followOffset = offset.clone();
    }

    public setCameraLerpSpeed(speed: number): void {
        this.config.followLerpSpeed = speed;
    }

    // Legacy method for compatibility - now updates follow offset
    public setDefaultPosition(position: Vector3): void {
        this.followOffset = position.clone();
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