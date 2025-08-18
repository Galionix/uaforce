import {
    AbstractMesh,
    Vector3,
    Scene,
    PhysicsAggregate,
    PhysicsShapeType,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Color4,
    ParticleSystem,
    Texture,
    Animation,
    IAnimationKey,
    EasingFunction,
    QuadraticEase,
    PhysicsBody,
    Ray,
    RayHelper,
    PickingInfo
} from '@babylonjs/core';

export interface ProjectileConfig {
    // Basic properties
    id: string;
    position: Vector3;
    direction: Vector3;
    speed: number;

    // Visual properties
    size: number;
    color?: Color3;
    meshType?: 'sphere' | 'box' | 'cylinder' | 'custom';
    customMesh?: AbstractMesh;

    // Physics properties
    mass?: number;
    hasPhysics?: boolean;
    gravityFactor?: number;

    // Behavior properties
    lifetime: number; // in milliseconds
    damage?: number;
    splashRadius?: number;
    splashDamage?: number;
    piercing?: boolean;
    bounciness?: number;

    // Effects
    trailEffect?: boolean;
    glowEffect?: boolean;
    particleEffect?: boolean;

    // Targeting
    targetType?: 'player' | 'enemy' | 'environment' | 'all';
    homing?: {
        target: AbstractMesh;
        strength: number;
    };

    // Callbacks
    onHit?: (target: AbstractMesh, hitPoint: Vector3) => void;
    onExpire?: (position: Vector3) => void;
    onSplash?: (center: Vector3, radius: number) => AbstractMesh[];
}

export abstract class BaseProjectile {
    protected mesh!: AbstractMesh; // Using definite assignment assertion
    protected physicsAggregate?: PhysicsAggregate;
    protected config: ProjectileConfig;
    protected scene: Scene;
    protected startTime: number;
    protected lastPosition: Vector3;
    protected isActive: boolean = true;
    protected velocity: Vector3;

    // Ray-based collision detection
    protected collisionRay?: Ray;
    protected rayHelper?: RayHelper;
    protected rayLength: number = 1.0; // Length of ray ahead of projectile

    // Effect systems
    protected particleSystem?: ParticleSystem;
    protected glowMaterial?: StandardMaterial;

    constructor(scene: Scene, config: ProjectileConfig) {
        this.scene = scene;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.startTime = Date.now();
        this.velocity = config.direction.normalize().scale(config.speed);
        this.lastPosition = config.position.clone(); // Initialize tracking position

        this.createMesh();
        this.setupPhysics();
        this.setupRayCollisionDetection();
        this.setupEffects();
        this.setupAnimations();
    }

    protected getDefaultConfig(): Partial<ProjectileConfig> {
        return {
            size: 0.1,
            color: Color3.Yellow(),
            meshType: 'sphere',
            mass: 0.1,
            hasPhysics: true,
            gravityFactor: 0.1,
            lifetime: 5000,
            damage: 10,
            splashRadius: 0,
            splashDamage: 0,
            piercing: false,
            bounciness: 0,
            trailEffect: false,
            glowEffect: true,
            particleEffect: false,
            targetType: 'all'
        };
    }

    protected createMesh(): void {
        switch (this.config.meshType) {
            case 'sphere':
                this.mesh = MeshBuilder.CreateSphere(
                    `projectile_${this.config.id}`,
                    { diameter: this.config.size },
                    this.scene
                );
                break;
            case 'box':
                this.mesh = MeshBuilder.CreateBox(
                    `projectile_${this.config.id}`,
                    { size: this.config.size },
                    this.scene
                );
                break;
            case 'cylinder':
                this.mesh = MeshBuilder.CreateCylinder(
                    `projectile_${this.config.id}`,
                    { height: this.config.size, diameter: this.config.size * 0.5 },
                    this.scene
                );
                break;
            case 'custom':
                if (this.config.customMesh) {
                    const cloned = this.config.customMesh.clone(`projectile_${this.config.id}`, null);
                    if (cloned) {
                        this.mesh = cloned;
                        this.mesh.scaling = Vector3.One().scale(this.config.size);
                    } else {
                        // Fallback to sphere if cloning fails
                        this.mesh = MeshBuilder.CreateSphere(
                            `projectile_${this.config.id}`,
                            { diameter: this.config.size },
                            this.scene
                        );
                    }
                } else {
                    // Fallback to sphere if custom mesh not provided
                    this.mesh = MeshBuilder.CreateSphere(
                        `projectile_${this.config.id}`,
                        { diameter: this.config.size },
                        this.scene
                    );
                }
                break;
        }

        this.mesh.position = this.config.position.clone();

        // Create material
        const material = new StandardMaterial(`projectileMat_${this.config.id}`, this.scene);
        material.diffuseColor = this.config.color || Color3.Yellow();
        material.emissiveColor = this.config.glowEffect ?
            (this.config.color || Color3.Yellow()).scale(0.3) : Color3.Black();
        this.mesh.material = material;

        if (this.config.glowEffect) {
            this.glowMaterial = material;
        }
    }

    protected setupPhysics(): void {
        if (!this.config.hasPhysics) return;

        this.physicsAggregate = new PhysicsAggregate(
            this.mesh,
            PhysicsShapeType.SPHERE,
            {
                mass: this.config.mass || 0.1,
                restitution: this.config.bounciness || 0
            },
            this.scene
        );

        console.log(`🏗️ Created physics aggregate for projectile ${this.config.id}:`);
        console.log(`  - Mass: ${this.config.mass || 0.1}`);
        console.log(`  - Restitution: ${this.config.bounciness || 0}`);
        console.log(`  - Shape: SPHERE`);
        console.log(`  - Physics body:`, this.physicsAggregate.body);

        // Set initial velocity
        this.physicsAggregate.body.setLinearVelocity(this.velocity);
        console.log(`🚀 Set projectile velocity to: ${this.velocity.toString()}`);

        // Adjust gravity if needed
        if (this.config.gravityFactor !== undefined && this.config.gravityFactor !== 1) {
            this.physicsAggregate.body.setGravityFactor(this.config.gravityFactor);
            console.log(`🌍 Set gravity factor to: ${this.config.gravityFactor}`);
        }

        // Setup collision detection
        console.log(`🔧 Setting up collision detection for projectile ${this.config.id}`);
        this.physicsAggregate.body.getCollisionObservable().add((collisionEvent) => {
            console.log(`🚨 COLLISION DETECTED for projectile ${this.config.id}!`);
            console.log(`Collision event:`, collisionEvent);
            console.log(`Collided against:`, collisionEvent.collidedAgainst);
            console.log(`Transform node:`, collisionEvent.collidedAgainst?.transformNode);

            // Get the mesh from the physics body
            const collidedMesh = collisionEvent.collidedAgainst.transformNode as AbstractMesh;
            if (collidedMesh) {
                console.log(`✅ Found collided mesh: ${collidedMesh.name}`);
                this.onCollision(collidedMesh);
            } else {
                console.log(`❌ No transform node found in collision event`);
            }
        });

        // FALLBACK: Manual intersection checking since Havok collision observable might not work
        console.log(`🔧 Setting up fallback intersection detection for projectile ${this.config.id}`);
        this.lastPosition = this.mesh.position.clone();
    }

    protected setupRayCollisionDetection(): void {
        console.log(`🔫 Setting up ray-based collision detection for projectile ${this.config.id}`);

        // Create collision ray - points in the direction of movement
        const rayDirection = this.velocity.normalize();
        this.collisionRay = new Ray(this.mesh.position, rayDirection, this.rayLength);

        // Create visible ray helper for debugging
        this.rayHelper = new RayHelper(this.collisionRay);
        this.rayHelper.show(this.scene, Color3.Red()); // Red ray for visibility

        console.log(`📡 Created collision ray:`);
        console.log(`  - Origin: ${this.collisionRay.origin.toString()}`);
        console.log(`  - Direction: ${this.collisionRay.direction.toString()}`);
        console.log(`  - Length: ${this.rayLength}`);
        console.log(`  - Ray helper visible: true`);
    }

    protected setupEffects(): void {
        if (this.config.trailEffect) {
            this.createTrailEffect();
        }

        if (this.config.particleEffect) {
            this.createParticleEffect();
        }
    }

    protected setupAnimations(): void {
        // Base implementation - can be overridden
        if (this.config.glowEffect && this.glowMaterial) {
            this.createGlowAnimation();
        }
    }

    protected createTrailEffect(): void {
        // Implementation for trail effect
        // Could use particle system or line mesh
    }

    protected createParticleEffect(): void {
        this.particleSystem = new ParticleSystem(`particles_${this.config.id}`, 50, this.scene);
        this.particleSystem.emitter = this.mesh;
        this.particleSystem.minEmitBox = new Vector3(-0.01, -0.01, -0.01);
        this.particleSystem.maxEmitBox = new Vector3(0.01, 0.01, 0.01);
        this.particleSystem.color1 = new Color4(1, 1, 0, 1);
        this.particleSystem.color2 = new Color4(1, 0.5, 0, 1);
        this.particleSystem.colorDead = new Color4(0, 0, 0, 0);
        this.particleSystem.minSize = 0.01;
        this.particleSystem.maxSize = 0.05;
        this.particleSystem.minLifeTime = 0.1;
        this.particleSystem.maxLifeTime = 0.3;
        this.particleSystem.emitRate = 100;
        this.particleSystem.start();
    }

    protected createGlowAnimation(): void {
        if (!this.glowMaterial) return;

        const glowAnimation = new Animation(
            `glowAnim_${this.config.id}`,
            "emissiveColor",
            30,
            Animation.ANIMATIONTYPE_COLOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keys: IAnimationKey[] = [];
        const baseColor = this.config.color || Color3.Yellow();
        keys.push({ frame: 0, value: baseColor.scale(0.2) });
        keys.push({ frame: 15, value: baseColor.scale(0.5) });
        keys.push({ frame: 30, value: baseColor.scale(0.2) });

        glowAnimation.setKeys(keys);

        const easingFunction = new QuadraticEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        glowAnimation.setEasingFunction(easingFunction);

        if (this.glowMaterial.animations) {
            this.glowMaterial.animations.push(glowAnimation);
            this.scene.beginAnimation(this.glowMaterial, 0, 30, true);
        }
    }

    protected onCollision(collidedMesh: AbstractMesh): void {
        if (!this.isActive) return;

        // Check if we should react to this collision based on target type
        if (!this.shouldReactToTarget(collidedMesh)) return;

        const hitPoint = this.mesh.position.clone();

        // Handle splash damage
        if (this.config.splashRadius && this.config.splashRadius > 0) {
            this.handleSplashDamage(hitPoint);
        }

        // Call hit callback
        if (this.config.onHit) {
            this.config.onHit(collidedMesh, hitPoint);
        }

        // Handle piercing
        if (!this.config.piercing) {
            this.destroy();
        }
    }

    protected shouldReactToTarget(target: AbstractMesh): boolean {
        // Basic implementation - can be enhanced with tags/metadata
        const targetMetadata = target.metadata;

        switch (this.config.targetType) {
            case 'player':
                return targetMetadata?.isPlayer === true;
            case 'enemy':
                return targetMetadata?.isEnemy === true;
            case 'environment':
                return targetMetadata?.isEnvironment === true;
            case 'all':
                return true;
            default:
                return true;
        }
    }

    protected handleSplashDamage(center: Vector3): void {
        if (!this.config.splashRadius || !this.config.onSplash) return;

        const affectedMeshes = this.config.onSplash(center, this.config.splashRadius);

        // Apply splash effects to affected meshes
        affectedMeshes.forEach(mesh => {
            const distance = Vector3.Distance(center, mesh.position);
            const damageRatio = Math.max(0, 1 - (distance / this.config.splashRadius!));
            const actualDamage = (this.config.splashDamage || 0) * damageRatio;

            // Apply damage/effects based on distance
            if (mesh.metadata) {
                mesh.metadata.splashDamage = actualDamage;
            }
        });
    }

    public update(deltaTime: number): void {
        if (!this.isActive) return;

        // Check lifetime
        const currentTime = Date.now();
        if (currentTime - this.startTime > this.config.lifetime) {
            this.expire();
            return;
        }

        // Update ray collision detection
        this.updateRayCollisionDetection();

        // Handle homing behavior
        if (this.config.homing && this.config.homing.target && this.physicsAggregate) {
            this.updateHoming(deltaTime);
        }

        // Update custom behavior
        this.updateCustomBehavior(deltaTime);

        // Update last position for collision detection
        this.lastPosition = this.mesh.position.clone();
    }

    protected updateRayCollisionDetection(): void {
        if (!this.collisionRay || !this.rayHelper) return;

        // Update ray origin to current projectile position
        this.collisionRay.origin = this.mesh.position.clone();

        // Update ray direction based on current velocity
        if (this.physicsAggregate) {
            const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
            if (currentVelocity.length() > 0.1) {
                this.collisionRay.direction = currentVelocity.normalize();
            }
        } else {
            this.collisionRay.direction = this.velocity.normalize();
        }

        // Update visible ray
        this.rayHelper.hide();
        this.rayHelper = new RayHelper(this.collisionRay);
        this.rayHelper.show(this.scene, Color3.Red());

        // Perform ray collision check
        this.performRayCollisionCheck();
    }

    protected performRayCollisionCheck(): void {
        if (!this.collisionRay) return;

        // Cast ray against all meshes in the scene
        const pickingInfo = this.scene.pickWithRay(this.collisionRay, (mesh) => {
            // Filter out the projectile itself and other projectiles
            if (mesh === this.mesh) return false;
            if (mesh.name.startsWith('projectile_')) return false;
            if (mesh.name.includes('__root__')) return false;
            if (mesh.name.toLowerCase().includes('ground')) return false; // Skip ground for now

            // Include any mesh that looks like a target (boxes, spheres, etc.)
            // OR has physics properties (checking multiple possible property names)
            const hasPhysics = (mesh as any).physicsAggregate ||
                              (mesh as any).aggregate ||
                              (mesh as any).physicsImpostor ||
                              (mesh as any).physicsBody;

            const isTargetMesh = mesh.name.toLowerCase().includes('box') ||
                               mesh.name.toLowerCase().includes('sphere') ||
                               mesh.name.toLowerCase().includes('cylinder') ||
                               mesh.name.toLowerCase().includes('light_') ||
                               mesh.name.toLowerCase().includes('cube');

            const shouldTarget = hasPhysics || isTargetMesh;

            if (shouldTarget) {
                console.log(`🎯 Ray targeting mesh: ${mesh.name} (hasPhysics: ${hasPhysics}, isTargetMesh: ${isTargetMesh})`);
            }

            return shouldTarget;
        });

        if (pickingInfo && pickingInfo.hit && pickingInfo.pickedMesh) {
            const hitMesh = pickingInfo.pickedMesh;
            const hitPoint = pickingInfo.pickedPoint;
            const distance = pickingInfo.distance;

            console.log(`🎯 RAY COLLISION DETECTED!`);
            console.log(`  - Projectile: ${this.config.id}`);
            console.log(`  - Hit mesh: ${hitMesh.name}`);
            console.log('hitMesh.metadata: ', hitMesh.metadata);
            console.log(`  - Hit point: ${hitPoint?.toString()}`);
            console.log(`  - Distance: ${distance?.toFixed(3)}`);
            console.log(`  - Ray origin: ${this.collisionRay.origin.toString()}`);
            console.log(`  - Ray direction: ${this.collisionRay.direction.toString()}`);

            // Trigger collision
            this.onCollision(hitMesh as AbstractMesh);
        }
    }

    private checkManualCollisions(): void {
        // This method is now replaced by ray-based detection
        // Keeping it as fallback but disabling by default
        return;
    }

    protected updateHoming(deltaTime: number): void {
        if (!this.config.homing || !this.physicsAggregate) return;

        const target = this.config.homing.target;
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        const directionToTarget = target.position.subtract(this.mesh.position).normalize();

        // Apply homing force
        const homingForce = directionToTarget.scale(this.config.homing.strength * deltaTime);
        const newVelocity = currentVelocity.add(homingForce);

        // Maintain speed
        const speed = this.config.speed;
        this.physicsAggregate.body.setLinearVelocity(newVelocity.normalize().scale(speed));
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Override in derived classes for custom behavior
    }

    protected expire(): void {
        if (this.config.onExpire) {
            this.config.onExpire(this.mesh.position.clone());
        }
        this.destroy();
    }

    public destroy(): void {
        if (!this.isActive) return;

        this.isActive = false;

        // Clean up effects
        if (this.particleSystem) {
            this.particleSystem.stop();
            this.particleSystem.dispose();
        }

        // Clean up ray helper
        if (this.rayHelper) {
            this.rayHelper.hide();
            this.rayHelper.dispose();
        }

        // Clean up physics
        if (this.physicsAggregate) {
            this.physicsAggregate.dispose();
        }

        // Clean up mesh
        if (this.mesh) {
            this.mesh.dispose();
        }
    }

    // Getters
    public get position(): Vector3 { return this.mesh.position; }
    public get isAlive(): boolean { return this.isActive; }
    public get damage(): number { return this.config.damage || 0; }
    public get id(): string { return this.config.id; }
    public get meshObject(): AbstractMesh { return this.mesh; }
}
