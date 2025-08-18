import { Vector3, PhysicsHelper, PhysicsRadialImpulseFalloff } from '@babylonjs/core';

/**
 * Utility class for handling explosions with GLB coordinate fixes
 */
export class ExplosionUtils {
  /**
   * Create an explosion at the specified position with automatic GLB coordinate correction
   * @param physicsHelper - The physics helper instance
   * @param center - The explosion center position
   * @param radius - Explosion radius
   * @param strength - Explosion strength
   * @param allMeshes - Array of all meshes in the scene for GLB detection
   * @param targetMesh - Optional specific mesh that was hit (for direct hits)
   */
  static createExplosion(
    physicsHelper: PhysicsHelper,
    center: Vector3,
    radius: number = 6,
    strength: number = 25,
    allMeshes: any[] = [],
    targetMesh?: any
  ) {
    let explosionCenter = center.clone();

    // For 2D gameplay, always use the actual collision point with minor adjustments
    if (targetMesh && this.isGLBObject(targetMesh)) {
      // Direct hit on GLB object - use the collision point but ensure it's at the surface
      explosionCenter = center.clone();
      explosionCenter.y += 0.2; // Small offset to ensure explosion is slightly above surface
    } else {
      // Ground or other collision - use exact hit point with small vertical offset
      explosionCenter = center.clone();
      explosionCenter.y += 0.2; // Small offset above collision point
    }

    // Ensure explosion is at Z=0 for 2D gameplay
    explosionCenter.z = 0;

    console.log(`💥 Creating explosion at: ${explosionCenter.toString()}`);
    console.log(`🎯 Original hit point: ${center.toString()}`);

    // Create the physical explosion
    return physicsHelper.applyRadialExplosionImpulse(
      explosionCenter,
      radius,
      strength,
      PhysicsRadialImpulseFalloff.Linear
    );
  }

  /**
   * Check if a mesh is a GLB object (loaded from level files)
   */
  static isGLBObject(mesh: any): boolean {
    return mesh.metadata &&
           (mesh.metadata.health !== undefined || mesh.metadata.mass !== undefined || mesh.metadata.isGLBBox);
  }
}
