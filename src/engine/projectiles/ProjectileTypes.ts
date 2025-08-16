import { Vector3, Color3, AbstractMesh, Scene } from '@babylonjs/core';
import { BaseProjectile, ProjectileConfig } from './BaseProjectile';

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
        // Create large explosion effect
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
        // Here you could add visual explosion effects
        console.log("Creating explosion visual effects...");

        // Could integrate with particle system:
        // - Create explosion particle burst
        // - Add screen shake
        // - Play explosion sound
        // - Create shockwave effect
    }
}
