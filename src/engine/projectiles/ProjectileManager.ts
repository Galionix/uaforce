import { Scene, Vector3, AbstractMesh, Ray, RayHelper } from '@babylonjs/core';
import { BaseProjectile, ProjectileConfig } from './BaseProjectile';
import {
    BulletProjectile,
    RocketProjectile,
    GrenadeProjectile,
    PlasmaProjectile,
    ArrowProjectile,
    FireballProjectile,
    IceShardProjectile,
    TimedBombProjectile,
    InstantBombProjectile
} from './ProjectileTypes';

interface ProjectileFactory {
    [key: string]: (scene: Scene, config: ProjectileConfig) => BaseProjectile;
}

export class ProjectileManager {
    private scene: Scene;
    private activeProjectiles: Map<string, BaseProjectile> = new Map();
    private projectileFactories: ProjectileFactory = {};
    private lastUpdateTime: number = 0;
    private projectileCounter: number = 0;

    // Performance optimization settings
    private maxActiveProjectiles: number = 100;
    private cullDistanceSquared: number = 10000; // 100 units squared
    private updateInterval: number = 16; // ~60fps

    // Debug options
    private debugMode: boolean = false;
    private debugRayHelpers: Map<string, RayHelper> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
        this.setupDefaultFactories();
    }

    /**
     * Setup default projectile factories for common types
     */
    private setupDefaultFactories(): void {
        // Register all available projectile types
        this.registerProjectileType('bullet', (scene, config) => new BulletProjectile(scene, config));
        this.registerProjectileType('rocket', (scene, config) => new RocketProjectile(scene, config));
        this.registerProjectileType('grenade', (scene, config) => new GrenadeProjectile(scene, config));
        this.registerProjectileType('plasma', (scene, config) => new PlasmaProjectile(scene, config));
        this.registerProjectileType('arrow', (scene, config) => new ArrowProjectile(scene, config));
        this.registerProjectileType('fireball', (scene, config) => new FireballProjectile(scene, config));
        this.registerProjectileType('iceshard', (scene, config) => new IceShardProjectile(scene, config));
        this.registerProjectileType('timedbomb', (scene, config) => new TimedBombProjectile(scene, config));
        this.registerProjectileType('instantbomb', (scene, config) => new InstantBombProjectile(scene, config));

        // Aliases for convenience
        this.registerProjectileType('bomb', (scene, config) => new TimedBombProjectile(scene, config));
        this.registerProjectileType('explosion', (scene, config) => new InstantBombProjectile(scene, config));
    }

    /**
     * Register a new projectile type with a factory function
     */
    public registerProjectileType(type: string, factory: (scene: Scene, config: ProjectileConfig) => BaseProjectile): void {
        this.projectileFactories[type] = factory;
    }

    /**
     * Create and fire a projectile
     */
    public fireProjectile(type: string, config: Partial<ProjectileConfig>): BaseProjectile | null {
        // Check if we're at the limit
        if (this.activeProjectiles.size >= this.maxActiveProjectiles) {
            this.cleanupOldestProjectile();
        }

        const factory = this.projectileFactories[type];
        if (!factory) {
            console.warn(`Unknown projectile type: ${type}`);
            return null;
        }

        // Generate unique ID
        const id = `${type}_${this.projectileCounter++}_${Date.now()}`;

        // Create complete config with defaults
        const completeConfig: ProjectileConfig = {
            id,
            position: Vector3.Zero(),
            direction: Vector3.Forward(),
            speed: 10,
            lifetime: 5000,
            size: 0.1,
            ...config
        } as ProjectileConfig;

        try {
            const projectile = factory(this.scene, completeConfig);
            this.activeProjectiles.set(id, projectile);

            if (this.debugMode) {
                this.createDebugRay(projectile);
            }

            return projectile;
        } catch (error) {
            console.error(`Failed to create projectile of type ${type}:`, error);
            return null;
        }
    }

    /**
     * Update all active projectiles
     */
    public update(): void {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;

        if (deltaTime < this.updateInterval) {
            return; // Skip update if not enough time has passed
        }

        this.lastUpdateTime = currentTime;
        const deltaTimeSeconds = deltaTime / 1000;

        // Update all projectiles and remove dead ones
        const toRemove: string[] = [];

        this.activeProjectiles.forEach((projectile, id) => {
            if (!projectile.isAlive) {
                toRemove.push(id);
                return;
            }

            // Cull projectiles that are too far away
            if (this.shouldCullProjectile(projectile)) {
                projectile.destroy();
                toRemove.push(id);
                return;
            }

            projectile.update(deltaTimeSeconds);
        });

        // Remove dead projectiles
        toRemove.forEach(id => {
            const projectile = this.activeProjectiles.get(id);
            if (projectile) {
                if (this.debugMode) {
                    this.removeDebugRay(id);
                }
                this.activeProjectiles.delete(id);
            }
        });
    }

    /**
     * Check if a projectile should be culled due to distance
     */
    private shouldCullProjectile(projectile: BaseProjectile): boolean {
        // Implement your camera or player position logic here
        // For now, we'll use a simple distance from origin check
        const distanceSquared = projectile.position.lengthSquared();
        return distanceSquared > this.cullDistanceSquared;
    }

    /**
     * Remove the oldest projectile to make room for new ones
     */
    private cleanupOldestProjectile(): void {
        const iterator = this.activeProjectiles.entries();
        const firstEntry = iterator.next();

        if (!firstEntry.done) {
            const [id, projectile] = firstEntry.value;
            projectile.destroy();
            this.activeProjectiles.delete(id);
        }
    }

    /**
     * Get all projectiles within a radius of a point
     */
    public getProjectilesInRadius(center: Vector3, radius: number): BaseProjectile[] {
        const result: BaseProjectile[] = [];
        const radiusSquared = radius * radius;

        this.activeProjectiles.forEach(projectile => {
            const distanceSquared = Vector3.DistanceSquared(center, projectile.position);
            if (distanceSquared <= radiusSquared) {
                result.push(projectile);
            }
        });

        return result;
    }

    /**
     * Get all projectiles of a specific type
     */
    public getProjectilesByType(type: string): BaseProjectile[] {
        const result: BaseProjectile[] = [];

        this.activeProjectiles.forEach(projectile => {
            if (projectile.id.startsWith(type)) {
                result.push(projectile);
            }
        });

        return result;
    }

    /**
     * Destroy a specific projectile by ID
     */
    public destroyProjectile(id: string): boolean {
        const projectile = this.activeProjectiles.get(id);
        if (projectile) {
            projectile.destroy();
            this.activeProjectiles.delete(id);
            if (this.debugMode) {
                this.removeDebugRay(id);
            }
            return true;
        }
        return false;
    }

    /**
     * Destroy all projectiles
     */
    public destroyAllProjectiles(): void {
        this.activeProjectiles.forEach((projectile, id) => {
            projectile.destroy();
            if (this.debugMode) {
                this.removeDebugRay(id);
            }
        });
        this.activeProjectiles.clear();
    }

    /**
     * Destroy all projectiles of a specific type
     */
    public destroyProjectilesByType(type: string): void {
        const toRemove: string[] = [];

        this.activeProjectiles.forEach((projectile, id) => {
            if (projectile.id.startsWith(type)) {
                projectile.destroy();
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => {
            this.activeProjectiles.delete(id);
            if (this.debugMode) {
                this.removeDebugRay(id);
            }
        });
    }

    /**
     * Create debug ray visualization for a projectile
     */
    private createDebugRay(projectile: BaseProjectile): void {
        if (!this.debugMode) return;

        const ray = new Ray(projectile.position, projectile.position.add(Vector3.Forward().scale(2)));
        const rayHelper = new RayHelper(ray);
        rayHelper.show(this.scene);
        this.debugRayHelpers.set(projectile.id, rayHelper);
    }

    /**
     * Remove debug ray visualization
     */
    private removeDebugRay(id: string): void {
        const rayHelper = this.debugRayHelpers.get(id);
        if (rayHelper) {
            rayHelper.hide();
            rayHelper.dispose();
            this.debugRayHelpers.delete(id);
        }
    }

    // Utility methods for common projectile patterns

    /**
     * Fire a projectile from point A to point B
     */
    public fireProjectileToTarget(type: string, from: Vector3, to: Vector3, config?: Partial<ProjectileConfig>): BaseProjectile | null {
        const direction = to.subtract(from).normalize();

        return this.fireProjectile(type, {
            position: from.clone(),
            direction: direction,
            ...config
        });
    }

    /**
     * Fire a projectile from a mesh towards another mesh
     */
    public fireProjectileBetweenMeshes(type: string, fromMesh: AbstractMesh, toMesh: AbstractMesh, config?: Partial<ProjectileConfig>): BaseProjectile | null {
        return this.fireProjectileToTarget(type, fromMesh.position, toMesh.position, config);
    }

    /**
     * Fire multiple projectiles in a spread pattern
     */
    public fireProjectileSpread(type: string, center: Vector3, direction: Vector3, count: number, spreadAngle: number, config?: Partial<ProjectileConfig>): BaseProjectile[] {
        const projectiles: BaseProjectile[] = [];
        const angleStep = spreadAngle / (count - 1);
        const startAngle = -spreadAngle / 2;

        for (let i = 0; i < count; i++) {
            const angle = startAngle + (angleStep * i);
            const rotatedDirection = this.rotateVectorAroundY(direction, angle);

            const projectile = this.fireProjectile(type, {
                position: center.clone(),
                direction: rotatedDirection,
                ...config
            });

            if (projectile) {
                projectiles.push(projectile);
            }
        }

        return projectiles;
    }

    /**
     * Rotate a vector around the Y axis by the given angle (in radians)
     */
    private rotateVectorAroundY(vector: Vector3, angle: number): Vector3 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return new Vector3(
            vector.x * cos - vector.z * sin,
            vector.y,
            vector.x * sin + vector.z * cos
        );
    }

    // Getters and setters
    public get activeProjectileCount(): number { return this.activeProjectiles.size; }
    public get maxProjectiles(): number { return this.maxActiveProjectiles; }
    public set maxProjectiles(value: number) { this.maxActiveProjectiles = Math.max(1, value); }
    public get cullDistance(): number { return Math.sqrt(this.cullDistanceSquared); }
    public set cullDistance(value: number) { this.cullDistanceSquared = value * value; }
    public get isDebugMode(): boolean { return this.debugMode; }
    public set isDebugMode(value: boolean) {
        this.debugMode = value;
        if (!value) {
            // Clean up all debug rays
            this.debugRayHelpers.forEach(helper => {
                helper.hide();
                helper.dispose();
            });
            this.debugRayHelpers.clear();
        }
    }
}
