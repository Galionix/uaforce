import { Scene, Vector3, AbstractMesh, Ray, RayHelper } from '@babylonjs/core';
import { ProjectileManager } from './ProjectileManager';
import {
    BulletProjectile,
    RocketProjectile,
    GrenadeProjectile,
    PlasmaProjectile,
    ArrowProjectile,
    FireballProjectile,
    IceShardProjectile,
    TimedBombProjectile
} from './ProjectileTypes';

/**
 * Integration example showing how to use the projectile system in your game
 */
export class ProjectileGameIntegration {
    private projectileManager: ProjectileManager;
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.projectileManager = new ProjectileManager(scene);
        this.registerCustomProjectiles();
    }

    /**
     * Register all custom projectile types
     */
    private registerCustomProjectiles(): void {
        this.projectileManager.registerProjectileType('bullet',
            (scene, config) => new BulletProjectile(scene, config));
        this.projectileManager.registerProjectileType('rocket',
            (scene, config) => new RocketProjectile(scene, config));
        this.projectileManager.registerProjectileType('grenade',
            (scene, config) => new GrenadeProjectile(scene, config));
        this.projectileManager.registerProjectileType('plasma',
            (scene, config) => new PlasmaProjectile(scene, config));
        this.projectileManager.registerProjectileType('arrow',
            (scene, config) => new ArrowProjectile(scene, config));
        this.projectileManager.registerProjectileType('fireball',
            (scene, config) => new FireballProjectile(scene, config));
        this.projectileManager.registerProjectileType('ice_shard',
            (scene, config) => new IceShardProjectile(scene, config));
        this.projectileManager.registerProjectileType('timed_bomb',
            (scene, config) => new TimedBombProjectile(scene, config));
    }

    /**
     * Example: Player shoots at enemies
     */
    public playerShoot(playerMesh: AbstractMesh, targetPosition: Vector3, weaponType: string = 'bullet'): void {
        const projectileConfig = {
            position: playerMesh.position.clone().add(new Vector3(0, 1, 0)), // Shoot from chest level
            direction: targetPosition.subtract(playerMesh.position).normalize(),
            targetType: 'enemy' as const,
            onHit: (target: AbstractMesh, hitPoint: Vector3) => {
                this.handlePlayerHit(target, hitPoint, weaponType);
            },
            onSplash: (center: Vector3, radius: number) => {
                return this.findMeshesInRadius(center, radius, 'enemy');
            }
        };

        this.projectileManager.fireProjectile(weaponType, projectileConfig);
    }

    /**
     * Example: Enemy shoots at player
     */
    public enemyShoot(enemyMesh: AbstractMesh, playerMesh: AbstractMesh, weaponType: string = 'bullet'): void {
        const projectileConfig = {
            position: enemyMesh.position.clone().add(new Vector3(0, 1, 0)),
            direction: playerMesh.position.subtract(enemyMesh.position).normalize(),
            targetType: 'player' as const,
            onHit: (target: AbstractMesh, hitPoint: Vector3) => {
                this.handleEnemyHit(target, hitPoint, weaponType);
            }
        };

        this.projectileManager.fireProjectile(weaponType, projectileConfig);
    }

    /**
     * Example: Grenade throw with arc calculation
     */
    public throwGrenade(fromPosition: Vector3, targetPosition: Vector3): void {
        const distance = Vector3.Distance(fromPosition, targetPosition);
        const throwAngle = Math.PI / 6; // 30 degrees
        const velocity = this.calculateThrowVelocity(distance, throwAngle);

        const direction = targetPosition.subtract(fromPosition);
        direction.y = 0; // Remove Y component for horizontal direction
        direction.normalize();

        // Add upward component for arc
        direction.y = Math.tan(throwAngle);
        direction.normalize();

        this.projectileManager.fireProjectile('grenade', {
            position: fromPosition.clone(),
            direction: direction,
            speed: velocity,
            targetType: 'all',
            onSplash: (center: Vector3, radius: number) => {
                return this.findMeshesInRadius(center, radius, 'all');
            }
        });
    }

    /**
     * Example: Homing missile
     */
    public fireHomingMissile(fromMesh: AbstractMesh, targetMesh: AbstractMesh): void {
        this.projectileManager.fireProjectile('rocket', {
            position: fromMesh.position.clone(),
            direction: targetMesh.position.subtract(fromMesh.position).normalize(),
            homing: {
                target: targetMesh,
                strength: 5.0
            },
            onHit: (target: AbstractMesh, hitPoint: Vector3) => {
                this.createExplosion(hitPoint, 3.0);
            }
        });
    }

    /**
     * Example: Shotgun spread
     */
    public fireShotgun(playerMesh: AbstractMesh, direction: Vector3): void {
        const pelletCount = 8;
        const spreadAngle = Math.PI / 6; // 30 degrees total spread

        this.projectileManager.fireProjectileSpread('bullet',
            playerMesh.position.clone().add(new Vector3(0, 1, 0)),
            direction,
            pelletCount,
            spreadAngle,
            {
                damage: 15, // Lower damage per pellet
                size: 0.03, // Smaller pellets
                targetType: 'enemy'
            }
        );
    }

    /**
     * Example: Magic spell casting
     */
    public castSpell(casterMesh: AbstractMesh, spellType: 'fireball' | 'ice_shard' | 'plasma', targetPosition: Vector3): void {
        const spellConfigs = {
            fireball: {
                particleEffect: true,
                trailEffect: true,
                onHit: (target: AbstractMesh, hitPoint: Vector3) => {
                    this.applyBurnEffect(target);
                }
            },
            ice_shard: {
                onHit: (target: AbstractMesh, hitPoint: Vector3) => {
                    this.applySlowEffect(target);
                }
            },
            plasma: {
                piercing: true,
                glowEffect: true
            }
        };

        this.projectileManager.fireProjectile(spellType, {
            position: casterMesh.position.clone().add(new Vector3(0, 1.5, 0)),
            direction: targetPosition.subtract(casterMesh.position).normalize(),
            ...spellConfigs[spellType]
        });
    }

    /**
     * Example: Throw timed bomb
     */
    public throwTimedBomb(fromPosition: Vector3, direction: Vector3): void {
        this.projectileManager.fireProjectile('timed_bomb', {
            position: fromPosition.clone(),
            direction: direction,
            targetType: 'all',
            onSplash: (center: Vector3, radius: number) => {
                return this.findMeshesInRadius(center, radius, 'all');
            }
        });
    }

    /**
     * Integration with your game's update loop
     */
    public update(): void {
        // Update projectile system
        this.projectileManager.update();

        // Handle any projectile-related game logic
        this.updateProjectileEffects();
    }

    /**
     * Handle when player projectiles hit enemies
     */
    private handlePlayerHit(target: AbstractMesh, hitPoint: Vector3, weaponType: string): void {
        // Here you would integrate with your damage system
        console.log(`Player hit enemy with ${weaponType} at`, hitPoint);

        // Example: Apply damage based on weapon type
        const damageMap: { [key: string]: number } = {
            bullet: 25,
            rocket: 50,
            plasma: 40,
            arrow: 35,
            fireball: 45,
            ice_shard: 30,
            timed_bomb: 80
        };

        const damage = damageMap[weaponType] || 10;
        this.applyDamage(target, damage);

        // Play hit sound, create hit effects, etc.
        // this.soundController?.playHitSound(weaponType);
        // this.effectsController?.createHitEffect(hitPoint, weaponType);
    }

    /**
     * Handle when enemy projectiles hit player
     */
    private handleEnemyHit(target: AbstractMesh, hitPoint: Vector3, weaponType: string): void {
        console.log(`Enemy hit player with ${weaponType} at`, hitPoint);

        // Apply damage to player
        this.applyDamage(target, 20);

        // Trigger screen shake, damage indicators, etc.
        // this.cameraController?.addScreenShake(0.5);
        // this.guiController?.showDamageIndicator();
    }

    /**
     * Calculate throwing velocity for arc trajectory
     */
    private calculateThrowVelocity(distance: number, angle: number): number {
        const gravity = 9.81;
        return Math.sqrt((distance * gravity) / Math.sin(2 * angle));
    }

    /**
     * Find all meshes within a radius (for splash damage)
     */
    private findMeshesInRadius(center: Vector3, radius: number, targetType: string): AbstractMesh[] {
        const result: AbstractMesh[] = [];

        this.scene.meshes.forEach(mesh => {
            if (!mesh.metadata) return;

            const shouldInclude = targetType === 'all' ||
                (targetType === 'enemy' && mesh.metadata.isEnemy) ||
                (targetType === 'player' && mesh.metadata.isPlayer) ||
                (targetType === 'environment' && mesh.metadata.isEnvironment);

            if (shouldInclude) {
                const distance = Vector3.Distance(center, mesh.position);
                if (distance <= radius) {
                    result.push(mesh);
                }
            }
        });

        return result;
    }

    /**
     * Apply damage to a target
     */
    private applyDamage(target: AbstractMesh, damage: number): void {
        if (!target.metadata) target.metadata = {};

        if (!target.metadata.health) target.metadata.health = 100;
        target.metadata.health -= damage;

        console.log(`Applied ${damage} damage to ${target.name}, health: ${target.metadata.health}`);

        if (target.metadata.health <= 0) {
            this.destroyTarget(target);
        }
    }

    /**
     * Destroy a target when health reaches zero
     */
    private destroyTarget(target: AbstractMesh): void {
        console.log(`Destroying ${target.name}`);

        // Create destruction effects
        this.createExplosion(target.position, 1.0);

        // Remove from scene
        target.dispose();
    }

    /**
     * Create explosion effect
     */
    private createExplosion(position: Vector3, intensity: number): void {
        console.log(`Creating explosion at`, position, `with intensity`, intensity);

        // Here you would integrate with your particle/effects system
        // this.effectsController?.createExplosion(position, intensity);
        // this.soundController?.playExplosion(intensity);

        // Apply screen shake based on distance to player
        // const distanceToPlayer = Vector3.Distance(position, this.playerPosition);
        // const shakeStrength = Math.max(0, 1 - distanceToPlayer / 10);
        // this.cameraController?.addScreenShake(shakeStrength * intensity);
    }

    /**
     * Apply burn effect to target
     */
    private applyBurnEffect(target: AbstractMesh): void {
        if (!target.metadata) target.metadata = {};

        target.metadata.burnEffect = {
            duration: 5000, // 5 seconds
            damagePerSecond: 5,
            appliedAt: Date.now()
        };

        console.log(`Applied burn effect to ${target.name}`);
    }

    /**
     * Apply slow effect to target
     */
    private applySlowEffect(target: AbstractMesh): void {
        if (!target.metadata) target.metadata = {};

        target.metadata.slowEffect = {
            duration: 3000, // 3 seconds
            strength: 0.5, // 50% speed reduction
            appliedAt: Date.now()
        };

        console.log(`Applied slow effect to ${target.name}`);
    }

    /**
     * Update ongoing projectile effects
     */
    private updateProjectileEffects(): void {
        // Process burn effects
        this.scene.meshes.forEach(mesh => {
            if (mesh.metadata?.burnEffect) {
                const effect = mesh.metadata.burnEffect;
                const elapsed = Date.now() - effect.appliedAt;

                if (elapsed >= effect.duration) {
                    delete mesh.metadata.burnEffect;
                } else {
                    // Apply periodic burn damage
                    const lastDamageTime = effect.lastDamageTime || effect.appliedAt;
                    if (Date.now() - lastDamageTime >= 1000) { // Damage every second
                        this.applyDamage(mesh, effect.damagePerSecond);
                        effect.lastDamageTime = Date.now();
                    }
                }
            }

            // Process slow effects (would be handled by your movement system)
            if (mesh.metadata?.slowEffect) {
                const effect = mesh.metadata.slowEffect;
                const elapsed = Date.now() - effect.appliedAt;

                if (elapsed >= effect.duration) {
                    delete mesh.metadata.slowEffect;
                }
            }
        });
    }

    // Debug methods
    public enableDebugMode(): void {
        this.projectileManager.isDebugMode = true;
    }

    public disableDebugMode(): void {
        this.projectileManager.isDebugMode = false;
    }

    public getActiveProjectileCount(): number {
        return this.projectileManager.activeProjectileCount;
    }

    // Cleanup
    public dispose(): void {
        this.projectileManager.destroyAllProjectiles();
    }
}
