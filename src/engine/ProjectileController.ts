import { Vector3, Scene, FreeCamera } from '@babylonjs/core';
import { Projectile, ProjectileConfig } from './Projectile';
import { SceneController } from './SceneController';
import { PlayerController } from './PlayerController';

export class ProjectileController {
  private scene: Scene;
  private sceneController: SceneController;
  private playerController: PlayerController;
  private activeProjectiles: Set<Projectile> = new Set();
  private maxProjectiles: number = 10; // Limit to prevent spam

  constructor(scene: Scene, sceneController: SceneController, playerController: PlayerController) {
    this.scene = scene;
    this.sceneController = sceneController;
    this.playerController = playerController;
  }

  /**
   * Fire a projectile from the player position in the player's facing direction
   */
  public fireProjectile(config?: ProjectileConfig): Projectile | null {
    // Prevent spam - limit active projectiles
    if (this.activeProjectiles.size >= this.maxProjectiles) {
      this.sceneController.soundController.playReload();
      console.warn('⚠️ Maximum projectiles reached, cannot fire more');
      return null;
    }

    // Get player position and facing direction
    const playerPosition = this.playerController.getPosition();
    const facingLeft = this.playerController.getFacingDirection();

    // Calculate projectile start position (slightly in front of player)
    const forwardOffset = facingLeft ? 1.5 : -1.5; // Positive X is left, negative X is right
    const startPosition = new Vector3(
      playerPosition.x + forwardOffset,
      playerPosition.y + 0.5, // Slightly above player center
      0 // Keep Z at 0 for 2D
    );

    // Calculate direction vector
    const direction = new Vector3(
      facingLeft ? 1 : -1, // Positive X is left, negative X is right
      0, // No vertical movement for horizontal shots
      0  // Keep Z at 0 for 2D
    );

    console.log(`🚀 Firing projectile from player position: ${playerPosition.toString()}`);
    console.log(`📍 Player facing: ${facingLeft ? 'LEFT' : 'RIGHT'}`);
    console.log(`📍 Projectile start: ${startPosition.toString()}`);
    console.log(`📍 Direction: ${direction.toString()}`);

    // Create new projectile
    const projectile = new Projectile(
      this.scene,
      this.sceneController,
      startPosition,
      direction,
      config
    );
    this.sceneController.soundController.playShot()
    // Track active projectile
    this.activeProjectiles.add(projectile);

    // Set up cleanup when projectile is destroyed
    this.scheduleProjectileCleanup(projectile);

    return projectile;
  }

  /**
   * Get player aiming direction for external systems
   */
  public getAimDirection(): Vector3 {
    const facingLeft = this.playerController.getFacingDirection();
    return new Vector3(
      facingLeft ? 1 : -1, // Positive X is left, negative X is right
      0, // Horizontal shot
      0  // Keep Z at 0 for 2D
    );
  }

  /**
   * Get player fire position for external systems
   */
  public getFirePosition(): Vector3 {
    const playerPosition = this.playerController.getPosition();
    const facingLeft = this.playerController.getFacingDirection();
    const forwardOffset = facingLeft ? 1.5 : -1.5;

    return new Vector3(
      playerPosition.x + forwardOffset,
      playerPosition.y + 0.5,
      0
    );
  }

  /**
   * Get count of active projectiles
   */
  public getActiveProjectileCount(): number {
    return this.activeProjectiles.size;
  }

  /**
   * Destroy all active projectiles (useful for scene reset)
   */
  public destroyAllProjectiles(): void {
    console.log(`🗑️ Destroying ${this.activeProjectiles.size} active projectiles`);

    for (const projectile of this.activeProjectiles) {
      projectile.destroyProjectile();
    }

    this.activeProjectiles.clear();
  }

  /**
   * Schedule automatic cleanup for a projectile
   */
  private scheduleProjectileCleanup(projectile: Projectile): void {
    // Check periodically if projectile is still active
    const checkInterval = setInterval(() => {
      if (!projectile.isActive()) {
        this.activeProjectiles.delete(projectile);
        clearInterval(checkInterval);
        console.log(`🧹 Cleaned up projectile. Active count: ${this.activeProjectiles.size}`);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Update method - can be called from game loop if needed
   */
  public update(): void {
    // Clean up any projectiles that might have been destroyed externally
    for (const projectile of this.activeProjectiles) {
      if (!projectile.isActive()) {
        this.activeProjectiles.delete(projectile);
      }
    }
  }

  /**
   * Set maximum number of simultaneous projectiles
   */
  public setMaxProjectiles(max: number): void {
    this.maxProjectiles = Math.max(1, max);
  }

  /**
   * Get maximum projectiles limit
   */
  public getMaxProjectiles(): number {
    return this.maxProjectiles;
  }
}
