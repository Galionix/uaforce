import { Vector3, Color3, AbstractMesh, Scene, PhysicsRadialImpulseFalloff } from '@babylonjs/core';
import { BaseProjectile, ProjectileConfig } from './BaseProjectile';

/**
 * Standardized explosion utility for all projectiles
 * Uses the proven PhysicsHelper approach from ExplosionTestScene
 *
 * EXPLOSION CONFIGURATION TABLE:
 * ┌─────────────────────┬────────┬───────┬─────────────────────────┐
 * │ Projectile Type     │ Radius │ Force │ Description             │
 * ├─────────────────────┼────────┼───────┼─────────────────────────┤
 * │ BulletProjectile    │   -    │   -   │ No explosion            │
 * │ RocketProjectile    │   4m   │  25N  │ Moderate missile blast  │
 * │ GrenadeProjectile   │   6m   │  40N  │ Large fragmentation     │
 * │ FireballProjectile  │   3m   │  20N  │ Small fire splash       │
 * │ TimedBombProjectile │   7m   │  60N  │ Massive timed explosion │
 * │ InstantBombProjectile│  5m   │  50N  │ Instant contact blast   │
 * └─────────────────────┴────────┴───────┴─────────────────────────┘
 *
 * Force values are tuned for satisfying object scattering without being overpowered.
 * All projectiles use Linear falloff for consistent behavior.
 */
export class ProjectileExplosionHelper {
    /**
     * Create a physics explosion at the specified location
     * @param scene - The Babylon.js scene
     * @param center - World position of explosion center
     * @param radius - Explosion radius (how far the effect reaches)
     * @param force - Explosion force (how strong the impulse is)
     * @param falloff - How force decreases with distance (default: Linear)
     */
    static createExplosion(
        scene: Scene,
        center: Vector3,
        radius: number,
        force: number,
        falloff: PhysicsRadialImpulseFalloff = PhysicsRadialImpulseFalloff.Linear
    ): void {
        console.log(`💥 Creating explosion at ${center.toString()} (radius=${radius}, force=${force})`);

        // Get PhysicsHelper from scene metadata (set up in SceneController)
        const sceneController = scene.metadata?.sceneController;
        const physicsHelper = sceneController?.physicsHelper;

        if (!physicsHelper) {
            console.error(`❌ No PhysicsHelper found! Explosion at ${center.toString()} failed`);
            return;
        }

        try {
            // Use the proven PhysicsHelper API from ExplosionTestScene
            const explosionEvent = physicsHelper.applyRadialExplosionImpulse(
                center,
                radius,
                force,
                falloff
            );

            if (explosionEvent) {
                console.log(`✅ Explosion successful!`);
                console.log(`  - Center: ${center.toString()}`);
                console.log(`  - Radius: ${radius}m`);
                console.log(`  - Force: ${force}N`);
                console.log(`  - Falloff: ${PhysicsRadialImpulseFalloff[falloff]}`);

                // Clean up the explosion event after a short delay
                setTimeout(() => {
                    explosionEvent.dispose();
                    console.log(`🧹 Explosion event cleaned up`);
                }, 100);
            } else {
                console.log("⚠️ PhysicsHelper returned null explosion event");
            }

        } catch (error) {
            console.error(`❌ Explosion failed:`, error);
        }
    }
}

/**
 * Fast bullet projectile - minimal effects, high speed
 */
export class BulletProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const bulletConfig: ProjectileConfig = {
            ...config,
            size: 0.3, // Made much bigger so it's visible
            speed: 20, // Slower so we can see it
            lifetime: 3000, // Longer lifetime
            color: Color3.Red(), // Changed to red for better visibility
            meshType: 'sphere',
            hasPhysics: true,
            gravityFactor: 0.1,
            glowEffect: true,
            trailEffect: false,
            particleEffect: false,
            damage: 25
        };

        super(scene, bulletConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Bullets don't need special behavior
    }
}

/**
 * Rocket projectile - slower but with splash damage
 */
export class RocketProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const rocketConfig: ProjectileConfig = {
            ...config,
            size: 0.15,
            speed: 20,
            lifetime: 8000,
            color: Color3.Red(),
            meshType: 'cylinder',
            hasPhysics: true,
            gravityFactor: 0.3,
            glowEffect: true,
            trailEffect: true,
            particleEffect: true,
            damage: 50,
            splashRadius: 3,
            splashDamage: 30
        };

        super(scene, rocketConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Add rocket trail particles and sound effects
        this.updateRocketTrail();
    }

    private updateRocketTrail(): void {
        // Enhanced particle system for rocket trail
        if (this.particleSystem) {
            // Increase particle emission for dramatic effect
            this.particleSystem.emitRate = 200;
        }
    }

    protected onCollision(collidedMesh: AbstractMesh): void {
        // Create explosion effect before calling parent
        this.createExplosion();
        super.onCollision(collidedMesh);
    }

    private createExplosion(): void {
        // Create physics explosion with rocket-appropriate values
        ProjectileExplosionHelper.createExplosion(
            this.scene,
            this.mesh.position.clone(),
            4, // Rocket explosion radius (smaller than instant bomb)
            25 // Rocket explosion force (moderate)
        );

        // Here you would integrate with your sound system
        // this.soundController?.playExplosion();

        // Create explosion visual effect
        // Could spawn debris particles or screen shake
    }
}

/**
 * Grenade projectile - arcs through the air and explodes after timer
 */
export class GrenadeProjectile extends BaseProjectile {
    private fuseTime: number;

    constructor(scene: Scene, config: ProjectileConfig) {
        const grenadeConfig: ProjectileConfig = {
            ...config,
            size: 0.12,
            speed: 15,
            lifetime: 4000, // 4 second fuse
            color: Color3.Green(),
            meshType: 'sphere',
            hasPhysics: true,
            gravityFactor: 1.0, // Full gravity for realistic arc
            glowEffect: false,
            trailEffect: false,
            particleEffect: false,
            damage: 0, // No direct damage
            splashRadius: 4,
            splashDamage: 75,
            bounciness: 0.3
        };

        super(scene, grenadeConfig);
        this.fuseTime = grenadeConfig.lifetime;
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Flash more frequently as fuse time decreases
        const remainingTime = this.fuseTime - (Date.now() - this.startTime);
        const flashInterval = Math.max(100, remainingTime / 10);

        if (Math.floor(Date.now() / flashInterval) % 2 === 0) {
            this.makeFlash(true);
        } else {
            this.makeFlash(false);
        }
    }

    private makeFlash(active: boolean): void {
        if (this.mesh.material) {
            const material = this.mesh.material as any;
            if (material.emissiveColor) {
                material.emissiveColor = active ? Color3.Red() : Color3.Black();
            }
        }
    }

    protected expire(): void {
        // Explode when fuse runs out
        this.createGrenadeExplosion();
        super.expire();
    }

    private createGrenadeExplosion(): void {
        // Create large explosion effect - grenades are powerful!
        ProjectileExplosionHelper.createExplosion(
            this.scene,
            this.mesh.position.clone(),
            6, // Grenade explosion radius (larger than rocket)
            40 // Grenade explosion force (strong)
        );

        // Integrate with sound and visual effects
    }
}

/**
 * Plasma projectile - energy-based with piercing ability
 */
export class PlasmaProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const plasmaConfig: ProjectileConfig = {
            ...config,
            size: 0.08,
            speed: 35,
            lifetime: 3000,
            color: new Color3(0, 1, 1), // Cyan
            meshType: 'sphere',
            hasPhysics: false, // Energy projectiles ignore physics
            gravityFactor: 0,
            glowEffect: true,
            trailEffect: true,
            particleEffect: true,
            damage: 40,
            piercing: true
        };

        super(scene, plasmaConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Plasma effect - pulsing glow and crackling particles
        this.updatePlasmaEffects();

        // Since it has no physics, we need to manually move it
        if (!this.config.hasPhysics) {
            this.moveWithoutPhysics(deltaTime);
        }
    }

    private updatePlasmaEffects(): void {
        // Enhance glow and particle effects
        if (this.particleSystem) {
            this.particleSystem.emitRate = 150;
        }
    }

    private moveWithoutPhysics(deltaTime: number): void {
        const movement = this.velocity.scale(deltaTime);
        this.mesh.position.addInPlace(movement);
    }
}

/**
 * Arrow projectile - medieval/fantasy style with gravity
 */
export class ArrowProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const arrowConfig: ProjectileConfig = {
            ...config,
            size: 0.2,
            speed: 25,
            lifetime: 6000,
            color: Color3.FromHexString("#8B4513"), // Brown
            meshType: 'cylinder',
            hasPhysics: true,
            gravityFactor: 0.8,
            glowEffect: false,
            trailEffect: false,
            particleEffect: false,
            damage: 35,
            piercing: false,
            bounciness: 0.1
        };

        super(scene, arrowConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Rotate arrow to face movement direction
        this.alignWithVelocity();
    }

    private alignWithVelocity(): void {
        if (this.physicsAggregate) {
            const velocity = this.physicsAggregate.body.getLinearVelocity();
            if (velocity.length() > 0.1) {
                this.mesh.lookAt(this.mesh.position.add(velocity));
            }
        }
    }
}

/**
 * Fireball projectile - magical with fire effects
 */
export class FireballProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const fireballConfig: ProjectileConfig = {
            ...config,
            size: 0.2,
            speed: 15,
            lifetime: 5000,
            color: Color3.FromHexString("#FF4500"), // Orange-red
            meshType: 'sphere',
            hasPhysics: true,
            gravityFactor: 0.2,
            glowEffect: true,
            trailEffect: true,
            particleEffect: true,
            damage: 45,
            splashRadius: 2,
            splashDamage: 20
        };

        super(scene, fireballConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Fireball-specific effects
        this.updateFireEffects();
    }

    private updateFireEffects(): void {
        // Enhance fire particle system
        if (this.particleSystem) {
            // Make particles look more like fire
            this.particleSystem.emitRate = 300;
        }

        // Random flickering effect
        if (Math.random() < 0.1 && this.mesh.material) {
            const material = this.mesh.material as any;
            if (material.emissiveColor) {
                const flicker = 0.8 + Math.random() * 0.4;
                material.emissiveColor = this.config.color!.scale(flicker);
            }
        }
    }

    protected onCollision(collidedMesh: AbstractMesh): void {
        // Create fire explosion on impact
        this.createFireExplosion();
        super.onCollision(collidedMesh);
    }

    private createFireExplosion(): void {
        // Create moderate fire explosion
        ProjectileExplosionHelper.createExplosion(
            this.scene,
            this.mesh.position.clone(),
            3, // Small explosion radius (fire splash)
            20 // Moderate explosion force
        );
    }
}

/**
 * Ice shard projectile - cold damage with slowing effect
 */
export class IceShardProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const iceConfig: ProjectileConfig = {
            ...config,
            size: 0.1,
            speed: 30,
            lifetime: 4000,
            color: Color3.FromHexString("#87CEEB"), // Sky blue
            meshType: 'box',
            hasPhysics: true,
            gravityFactor: 0.4,
            glowEffect: true,
            trailEffect: false,
            particleEffect: true,
            damage: 30
        };

        super(scene, iceConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Ice crystal spinning effect
        this.mesh.rotation.y += deltaTime * 2;
        this.mesh.rotation.x += deltaTime * 1;
    }

    protected onCollision(collidedMesh: AbstractMesh): void {
        // Apply slowing effect to target
        this.applySlowEffect(collidedMesh);
        super.onCollision(collidedMesh);
    }

    private applySlowEffect(target: AbstractMesh): void {
        // Add slow effect metadata that other systems can read
        if (!target.metadata) target.metadata = {};
        target.metadata.slowEffect = {
            duration: 3000, // 3 seconds
            strength: 0.5, // 50% speed reduction
            appliedAt: Date.now()
        };
    }
}

/**
 * Timed bomb projectile - explodes after exactly 2 seconds
 */
export class TimedBombProjectile extends BaseProjectile {
    private explosionTime: number;
    private hasExploded: boolean = false;

    constructor(scene: Scene, config: ProjectileConfig) {
        const bombConfig: ProjectileConfig = {
            ...config,
            size: 0.2, // Medium size bomb
            speed: 15,
            lifetime: 2000, // 2 seconds until explosion
            color: Color3.FromHexString("#FF6600"), // Orange
            meshType: 'sphere',
            hasPhysics: true,
            gravityFactor: 0.8, // Affected by gravity like a real bomb
            glowEffect: true,
            trailEffect: false,
            particleEffect: false,
            damage: 0, // No direct damage
            splashRadius: 4, // Large explosion radius
            splashDamage: 80, // High explosion damage
            bounciness: 0.2 // Bounces a bit when it hits surfaces
        };

        super(scene, bombConfig);
        this.explosionTime = Date.now() + 2000; // Explode in exactly 2 seconds
    }

    protected updateCustomBehavior(deltaTime: number): void {
        const currentTime = Date.now();
        const timeLeft = this.explosionTime - currentTime;

        // Don't process if already exploded
        if (this.hasExploded) return;

        // Flash faster as explosion approaches
        const flashInterval = Math.max(50, timeLeft / 20); // Flash faster as time runs out
        const shouldFlash = Math.floor(currentTime / flashInterval) % 2 === 0;

        // Make the bomb flash red/orange
        if (this.mesh.material) {
            const material = this.mesh.material as any;
            if (material.emissiveColor) {
                if (shouldFlash) {
                    // Flash bright red when about to explode
                    const intensity = timeLeft < 500 ? 1.0 : 0.5;
                    material.emissiveColor = Color3.Red().scale(intensity);
                } else {
                    // Return to orange
                    material.emissiveColor = this.config.color!.scale(0.3);
                }
            }
        }

        // Explode when time is up
        if (timeLeft <= 0 && !this.hasExploded) {
            this.explode();
        }
    }

    protected onCollision(collidedMesh: AbstractMesh): void {
        // Don't explode on collision - wait for timer
        // Just bounce off surfaces
        console.log("Timed bomb bounced off:", collidedMesh.name);
    }

    protected expire(): void {
        // Override expire to trigger explosion instead of just disappearing
        if (!this.hasExploded) {
            this.explode();
        }
        super.expire();
    }

    private explode(): void {
        if (this.hasExploded) return;

        this.hasExploded = true;
        console.log("TIMED BOMB EXPLODED at position:", this.mesh.position);

        // Create explosion effect
        this.createExplosionEffect();

        // Handle splash damage
        if (this.config.splashRadius && this.config.onSplash) {
            const affectedMeshes = this.config.onSplash(this.mesh.position, this.config.splashRadius);

            // Apply splash damage
            affectedMeshes.forEach(mesh => {
                const distance = Vector3.Distance(this.mesh.position, mesh.position);
                const damageRatio = Math.max(0, 1 - (distance / this.config.splashRadius!));
                const actualDamage = (this.config.splashDamage || 0) * damageRatio;

                console.log(`Explosion damaged ${mesh.name}: ${actualDamage} damage (distance: ${distance.toFixed(2)})`);

                // Apply damage metadata
                if (!mesh.metadata) mesh.metadata = {};
                mesh.metadata.explosionDamage = actualDamage;
                mesh.metadata.explosionTime = Date.now();
            });
        }

        // Destroy the projectile
        this.destroy();
    }

    private createExplosionEffect(): void {
        // Create massive explosion - timed bombs are very powerful!
        ProjectileExplosionHelper.createExplosion(
            this.scene,
            this.mesh.position.clone(),
            7, // Large explosion radius (biggest of all projectiles)
            60 // Very strong explosion force
        );

        // Here you could add visual explosion effects
        console.log("Creating explosion visual effects...");

        // Could integrate with particle system:
        // - Create explosion particle burst
        // - Add screen shake
        // - Play explosion sound
        // - Create shockwave effect
    }
}

/**
 * Instant Bomb Projectile - Explodes immediately on collision with physics objects
 * Creates a physics shockwave that scatters nearby objects
 */
export class InstantBombProjectile extends BaseProjectile {
    private hasExploded = false;
    private shockwaveRadius = 5; // Radius of physics shockwave
    private shockwaveForce = 50; // Force applied to scattered objects

    constructor(scene: Scene, config: ProjectileConfig) {
        const bombConfig: ProjectileConfig = {
            ...config,
            size: 0.4,
            speed: 15,
            lifetime: 5000,
            color: Color3.Yellow(),
            meshType: 'sphere',
            hasPhysics: true,
            gravityFactor: 0.5,
            glowEffect: true,
            trailEffect: false,
            particleEffect: true,
            damage: 100,
            splashRadius: 3,
            splashDamage: 75
        };

        super(scene, bombConfig);

        // Make ray longer for instant bombs to detect collisions earlier
        this.rayLength = 2.0; // Longer ray for early detection

        console.log("🚀 InstantBombProjectile created:");
        console.log(`  - Position: ${bombConfig.position?.toString()}`);
        console.log(`  - Direction: ${bombConfig.direction?.toString()}`);
        console.log(`  - Speed: ${bombConfig.speed}`);
        console.log(`  - Shockwave radius: ${this.shockwaveRadius}`);
        console.log(`  - Shockwave force: ${this.shockwaveForce}`);
        console.log(`  - Ray length: ${this.rayLength}`);
        console.log("  - Will explode on collision with physics objects");
    }

    protected onCollision(collidedMesh: AbstractMesh): void {
        console.log(`🎯 InstantBombProjectile collided with: ${collidedMesh.name}`);
        console.log(`Mesh position: ${collidedMesh.position.toString()}`);
        console.log(`Mesh has physicsAggregate: ${!!(collidedMesh as any).physicsAggregate}`);
        console.log(`Mesh has aggregate: ${!!(collidedMesh as any).aggregate}`);

        // Only explode if the collided mesh has a physics aggregate
        if ((collidedMesh as any).physicsAggregate || (collidedMesh as any).aggregate) {
            console.log(`✅ Physics object detected - EXPLODING!`);
            this.explodeInstantly();
        } else {
            console.log(`❌ No physics detected on ${collidedMesh.name} - no explosion, just destroying projectile`);
            // Still destroy the projectile even if no explosion
            this.destroy();
        }
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Debug: Log position every second to see if projectile is moving
        const now = Date.now();
        if (!this.lastPositionLog || now - this.lastPositionLog > 1000) {
            console.log(`📍 InstantBomb position: ${this.mesh.position.toString()}`);
            if (this.physicsAggregate) {
                const velocity = this.physicsAggregate.body.getLinearVelocity();
                console.log(`🏃 InstantBomb velocity: ${velocity.toString()}`);
            }
            if (this.collisionRay) {
                console.log(`🔫 InstantBomb ray: origin=${this.collisionRay.origin.toString()}, direction=${this.collisionRay.direction.toString()}`);
            }
            this.lastPositionLog = now;
        }
    }

    private lastPositionLog: number = 0;

    private explodeInstantly(): void {
        if (this.hasExploded) {
            console.log("💣 InstantBombProjectile already exploded, ignoring");
            return;
        }

        this.hasExploded = true;
        const explosionPosition = this.mesh.position.clone();

        console.log("💥💥💥 INSTANT BOMB EXPLODED! 💥💥💥");
        console.log(`Explosion position: ${explosionPosition.toString()}`);
        console.log(`Shockwave radius: ${this.shockwaveRadius}`);
        console.log(`Shockwave force: ${this.shockwaveForce}`);

        // Create visual explosion effect
        this.createExplosionEffect();

        // Create physics shockwave to scatter objects
        ProjectileExplosionHelper.createExplosion(
            this.scene,
            explosionPosition,
            this.shockwaveRadius,
            this.shockwaveForce
        );

        // Handle splash damage if callback is available
        if (this.config.splashRadius && this.config.onSplash) {
            console.log("💀 Applying splash damage...");
            const affectedMeshes = this.config.onSplash(explosionPosition, this.config.splashRadius);
            this.applySplashDamage(affectedMeshes, explosionPosition);
        } else {
            console.log("⚠️ No splash damage callback available");
        }

        // Destroy the projectile
        console.log("🗑️ Destroying instant bomb projectile");
        this.destroy();
    }

    private applySplashDamage(affectedMeshes: AbstractMesh[], explosionCenter: Vector3): void {
        affectedMeshes.forEach(mesh => {
            const distance = Vector3.Distance(explosionCenter, mesh.position);
            const damageRatio = Math.max(0, 1 - (distance / this.config.splashRadius!));
            const actualDamage = (this.config.splashDamage || 0) * damageRatio;

            console.log(`Explosion damaged ${mesh.name}: ${actualDamage} damage (distance: ${distance.toFixed(2)})`);

            // Apply damage metadata
            if (!mesh.metadata) mesh.metadata = {};
            mesh.metadata.explosionDamage = actualDamage;
            mesh.metadata.explosionTime = Date.now();
        });
    }

    private createExplosionEffect(): void {
        console.log("Creating instant explosion visual effects...");

        // Here you could add:
        // - Particle explosion burst
        // - Screen shake effect
        // - Explosion sound
        // - Flash effect
        // - Shockwave ring animation

        // For now, just log the explosion
        console.log("💥 INSTANT EXPLOSION! 💥");
    }

    // Getters for configuration
    public setShockwaveRadius(radius: number): void {
        this.shockwaveRadius = radius;
    }

    public setShockwaveForce(force: number): void {
        this.shockwaveForce = force;
    }

    public getShockwaveRadius(): number {
        return this.shockwaveRadius;
    }

    public getShockwaveForce(): number {
        return this.shockwaveForce;
    }
}
