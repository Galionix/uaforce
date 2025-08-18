import {
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scene,
  PhysicsAggregate,
  PhysicsShapeType,
  Ray,
  RayHelper,
  PickingInfo
} from '@babylonjs/core';
import { ExplosionUtils } from './ExplosionUtils';
import { SceneController } from './SceneController';

export interface ProjectileConfig {
  speed?: number;
  explosionRadius?: number;
  explosionStrength?: number;
  lifeTime?: number;
  size?: number;
  color?: Color3;
}

export class Projectile {
  private mesh: any;
  private aggregate?: PhysicsAggregate; // Store reference to physics aggregate
  private ray!: Ray; // Definite assignment - initialized in createRay()
  private rayHelper?: RayHelper;
  private scene: Scene;
  private sceneController: SceneController;
  private config: Required<ProjectileConfig>;
  private startTime: number;
  private direction: Vector3;
  private isDestroyed: boolean = false;

  constructor(
    scene: Scene,
    sceneController: SceneController,
    startPosition: Vector3,
    direction: Vector3,
    config: ProjectileConfig = {}
  ) {
    this.scene = scene;
    this.sceneController = sceneController;
    this.direction = direction.normalize();
    this.startTime = performance.now();

    // Default configuration
    this.config = {
      speed: config.speed ?? 50,
      explosionRadius: config.explosionRadius ?? 6,
      explosionStrength: config.explosionStrength ?? 25,
      lifeTime: config.lifeTime ?? 5000, // 5 seconds
      size: config.size ?? 0.2,
      color: config.color ?? new Color3(1, 0.5, 0) // Orange
    };

    this.createProjectileMesh(startPosition);
    this.createRay();
    this.startFlying();
  }

  private createProjectileMesh(position: Vector3): void {
    // Create a small sphere for the projectile
    this.mesh = MeshBuilder.CreateSphere(
      `projectile_${Date.now()}`,
      { diameter: this.config.size },
      this.scene
    );

    this.mesh.position = position.clone();

    // Create glowing material
    const material = new StandardMaterial(`projectileMaterial_${Date.now()}`, this.scene);
    material.emissiveColor = this.config.color;
    material.diffuseColor = this.config.color;
    this.mesh.material = material;

    // Make it physics-enabled but very light
    this.aggregate = new PhysicsAggregate(
      this.mesh,
      PhysicsShapeType.SPHERE,
      {
        mass: 0.1,
        restitution: 0.1,
        friction: 0.1
      },
      this.scene
    );

    // Set initial velocity
    if (this.aggregate.body) {
      const velocity = this.direction.scale(this.config.speed);
      this.aggregate.body.setLinearVelocity(velocity);

      // Disable gravity for projectile (optional - can be enabled for ballistic trajectory)
      this.aggregate.body.setGravityFactor(0);

      // Lock Z position for 2D movement
      const sceneController = this.sceneController;
      if (sceneController && sceneController.physics2DConstraintSystem) {
        sceneController.physics2DConstraintSystem.registerPhysicsBody(this.aggregate.body, 'Projectile');
      }
    }
  }

  private createRay(): void {
    // Create ray pointing forward from projectile
    this.ray = new Ray(this.mesh.position, this.direction);

    // Optional: Create visual ray helper for debugging
    // Uncomment the next line to see the ray
    // this.rayHelper = new RayHelper(this.ray);
    // this.rayHelper.show(this.scene, new Color3(1, 1, 0));
  }

  private startFlying(): void {
    // Register update loop
    const updateObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });

    // Store observer for cleanup
    (this.mesh as any).updateObserver = updateObserver;
  }

  private update(): void {
    if (this.isDestroyed) return;

    // Check lifetime
    if (performance.now() - this.startTime > this.config.lifeTime) {
      this.explode(this.mesh.position);
      return;
    }

    // Update ray position
    this.ray.origin = this.mesh.position.clone();

    // Cast ray forward to check for collisions
    const rayLength = this.config.speed * (1/60); // Assuming 60 FPS
    const pickInfo = this.scene.pickWithRay(this.ray, (mesh) => {
      // Ignore the projectile itself
      return mesh !== this.mesh;
    }, false);

    if (pickInfo && pickInfo.hit && pickInfo.distance && pickInfo.distance <= rayLength) {
      // Collision detected!
      const collisionPoint = pickInfo.pickedPoint || this.mesh.position;
      const hitMesh = pickInfo.pickedMesh;

      this.explode(collisionPoint, hitMesh);
    }
  }

  private explode(position: Vector3, hitMesh?: any): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    console.log(`💥 Projectile explosion at: ${position.toString()}`);
    if (hitMesh) {
      console.log(`🎯 Hit mesh: "${hitMesh.name}"`);
    }

    // Create explosion using our clean utility
    const explosion = ExplosionUtils.createExplosion(
      this.sceneController.physicsHelper,
      position,
      this.config.explosionRadius,
      this.config.explosionStrength,
      this.scene.meshes,
      hitMesh // Pass hit mesh for direct GLB hits
    );

    // Clean up explosion after delay
    if (explosion) {
      setTimeout(() => {
        explosion.dispose();
      }, 3000);
    }

    // Destroy projectile
    this.destroy();
  }

  private destroy(): void {
    if (this.mesh) {
      // Clean up update observer
      if ((this.mesh as any).updateObserver) {
        this.scene.onBeforeRenderObservable.remove((this.mesh as any).updateObserver);
      }

      // IMPORTANT: Unregister from 2D constraint system BEFORE disposing physics
      if (this.aggregate && this.aggregate.body) {
        const sceneController = this.sceneController;
        if (sceneController && sceneController.physics2DConstraintSystem) {
          sceneController.physics2DConstraintSystem.unregisterPhysicsBody(this.aggregate.body);
          console.log('🧹 Unregistered projectile from 2D constraint system');
        }
      }

      // Dispose mesh and physics
      this.mesh.dispose();
      this.aggregate = undefined; // Clear reference
    }

    // Clean up ray helper if exists
    if (this.rayHelper) {
      this.rayHelper.dispose();
    }
  }

  // Public method to manually destroy projectile
  public destroyProjectile(): void {
    this.destroy();
  }

  // Get projectile position for external systems
  public getPosition(): Vector3 {
    return this.mesh ? this.mesh.position.clone() : Vector3.Zero();
  }

  // Check if projectile is still active
  public isActive(): boolean {
    return !this.isDestroyed && !!this.mesh;
  }
}
