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
    PhysicsBody
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
    protected isActive: boolean = true;
    protected velocity: Vector3;

    // Effect systems
    protected particleSystem?: ParticleSystem;
    protected glowMaterial?: StandardMaterial;

    constructor(scene: Scene, config: ProjectileConfig) {
        this.scene = scene;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.startTime = Date.now();
        this.velocity = config.direction.normalize().scale(config.speed);

        this.createMesh();
        this.setupPhysics();
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

        // Set initial velocity
        this.physicsAggregate.body.setLinearVelocity(this.velocity);

        // Adjust gravity if needed
        if (this.config.gravityFactor !== undefined && this.config.gravityFactor !== 1) {
            this.physicsAggregate.body.setGravityFactor(this.config.gravityFactor);
        }

        // Setup collision detection
        this.physicsAggregate.body.getCollisionObservable().add((collisionEvent) => {
            // Get the mesh from the physics body
            const collidedMesh = collisionEvent.collidedAgainst.transformNode as AbstractMesh;
            if (collidedMesh) {
                this.onCollision(collidedMesh);
            }
        });
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

        // Handle homing behavior
        if (this.config.homing && this.config.homing.target && this.physicsAggregate) {
            this.updateHoming(deltaTime);
        }

        // Update custom behavior
        this.updateCustomBehavior(deltaTime);
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
