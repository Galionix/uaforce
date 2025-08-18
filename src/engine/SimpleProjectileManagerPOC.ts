import { Scene, Vector3 } from '@babylonjs/core';
import { SimpleProjectilePOC } from './SimpleProjectilePOC';

/**
 * Super simple POC projectile manager
 * Just manages a list of projectiles and updates them
 */
export class SimpleProjectileManagerPOC {
    private scene: Scene;
    private projectiles: SimpleProjectilePOC[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
        console.log("🎯 Simple POC Projectile Manager created");
    }

    /**
     * Fire a projectile from position in direction
     */
    public fireProjectile(startPosition: Vector3, direction: Vector3): void {
        console.log("🔫 Firing POC projectile:");
        console.log(`  - From: ${startPosition.toString()}`);
        console.log(`  - Direction: ${direction.toString()}`);

        const projectile = new SimpleProjectilePOC(this.scene, startPosition, direction);
        this.projectiles.push(projectile);

        console.log(`📊 Total active POC projectiles: ${this.projectiles.length}`);
    }

    /**
     * Update all projectiles
     */
    public update(deltaTime: number): void {
        // Update all active projectiles
        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime);
        });

        // Remove destroyed projectiles
        const initialCount = this.projectiles.length;
        this.projectiles = this.projectiles.filter(projectile => !projectile.isDestroyed());

        if (this.projectiles.length !== initialCount) {
            console.log(`🧹 Cleaned up destroyed projectiles. Active count: ${this.projectiles.length}`);
        }
    }

    /**
     * Clean up all projectiles
     */
    public dispose(): void {
        console.log("🗑️ Disposing all POC projectiles");
        this.projectiles.forEach(projectile => projectile.dispose());
        this.projectiles = [];
    }

    /**
     * Get count of active projectiles
     */
    public getActiveCount(): number {
        return this.projectiles.length;
    }
}
