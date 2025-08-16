import {
  AbstractMesh,
  Mesh,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { SceneController } from '../SceneController';
import Logger from '../../utils/logger';

export interface MeshDictionary {
  ground: {
    id_includes: string;
    mesh: AbstractMesh;
    allMeshes: AbstractMesh[];
  };
}

export class MeshProcessor {
  private _scene: Scene;
  private _sceneController: SceneController;
  private meshDict: MeshDictionary;

  constructor(scene: Scene, sceneController: SceneController, meshDict: MeshDictionary) {
    this._scene = scene;
    this._sceneController = sceneController;
    this.meshDict = meshDict;
  }

  processMeshes(
    chunkXY: string,
    meshes: AbstractMesh[],
    extensionDir?: {
      x: number;
      y: number;
    }
  ): AbstractMesh | null {
    let groundMesh: AbstractMesh | null = null;

    meshes.forEach((mesh) => {
      Logger.levelLoader.debug('mesh.metadata.gltf?.extras: ', mesh.metadata?.gltf?.extras?.collideable === true);

      // Handle collision detection for meshes with collideable metadata or death planes
      if (mesh.metadata?.gltf?.extras?.collideable === true || mesh.name === 'death plane') {
        mesh.checkCollisions = true;
        const groundAggregate = new PhysicsAggregate(
          mesh,
          PhysicsShapeType.MESH,
          {
            mass: 0,        // Static ground
            friction: 0,  // Higher friction for better box interaction
            restitution: 0.1 // Small bounce for more realistic ground
          },
          this._scene
        );

        Logger.levelLoader.info(`Collideable mesh physics created for: ${mesh.name} (mass: 0, friction: 0.8)`);

        // CRITICAL: Register with 2D constraint system to prevent Z-axis movement
        const sceneController = this._sceneController;
        if (sceneController.physics2DConstraintSystem && groundAggregate.body) {
          sceneController.physics2DConstraintSystem.registerPhysicsBody(groundAggregate.body, mesh.name);
          Logger.levelLoader.info(`Registered ground/collideable ${mesh.name} with 2D constraint system`);
        }

        // Log death plane setup specifically
        if (mesh.name === 'death plane') {
          Logger.levelLoader.info(`Death plane physics aggregate created for mesh: ${mesh.name}`);
          Logger.levelLoader.info(`Death plane position: ${mesh.position.toString()}`);

          // Ensure death plane has proper metadata for detection
          if (!mesh.metadata) mesh.metadata = {};
          if (!mesh.metadata.gltf) mesh.metadata.gltf = {};
          if (!mesh.metadata.gltf.extras) mesh.metadata.gltf.extras = {};
          mesh.metadata.gltf.extras.deathPlane = true;
        }
      }

      // Handle projectile boxes with physics
      if (this.isProjectileBox(mesh)) {
        this.setupProjectileBox(mesh);
      }

      // Handle ground meshes
        this.meshDict.ground.allMeshes.push(mesh);

    });

    Logger.levelLoader.debug("groundMesh: ", groundMesh);

    if (groundMesh) {
      this.setupGroundMesh(groundMesh);
    }

    return groundMesh;
  }

  private setupGroundMesh(groundMesh: AbstractMesh): void {
    // Set up camera ground mesh reference
    this._sceneController.game._camera?.setGroundMesh(groundMesh as Mesh);

    // Enable collisions for ground mesh
    (groundMesh as Mesh).checkCollisions = true;

    // Create physics aggregate for ground
    const groundAggregate = new PhysicsAggregate(
      groundMesh,
      PhysicsShapeType.MESH,
      { mass: 0, friction: 1 },
      this._scene
    );
  }

  /**
   * Check if a mesh is a projectile box based on name patterns or GLTF extras
   */
  private isProjectileBox(mesh: AbstractMesh): boolean {
    // Check by name patterns (from Blender export)
    const boxNamePatterns = [
      /.*box.*/i,
      /.*crate.*/i,
      /.*barrel.*/i,
      /.*container.*/i,
      /light_box.*/i,
      /heavy_box.*/i,
      /explosive_box.*/i,
      /armored_box.*/i
    ];

    const matchesName = boxNamePatterns.some(pattern => pattern.test(mesh.name));

    // Check if it has projectile metadata from GLTF extras
    const gltfExtras = mesh.metadata?.gltf?.extras;
    const hasProjectileMetadata = gltfExtras && (
      gltfExtras.isEnvironment ||
      gltfExtras.health ||
      gltfExtras.mass ||
      gltfExtras.destructible ||
      gltfExtras.explosive
    );

    return matchesName || hasProjectileMetadata;
  }

  /**
   * Setup physics and projectile properties for a box mesh from GLTF extras
   */
  private setupProjectileBox(mesh: AbstractMesh): void {
    Logger.levelLoader.info(`Setting up projectile box: ${mesh.name}`);

    // Extract properties from GLTF extras
    const gltfExtras = mesh.metadata?.gltf?.extras || {};

    // Default values if not specified in GLTF extras
    const boxProperties = {
      isEnvironment: gltfExtras.isEnvironment !== undefined ? gltfExtras.isEnvironment : true,
      health: gltfExtras.health || 50,
      mass: gltfExtras.mass || 10,
      destructible: gltfExtras.destructible !== undefined ? gltfExtras.destructible : true,
      explosive: gltfExtras.explosive !== undefined ? gltfExtras.explosive : false,
      restitution: gltfExtras.restitution || 0.3, // Bounciness
      friction: gltfExtras.friction || 0.8        // Surface friction
    };

    // Update mesh metadata with processed properties (for projectile system access)
    if (!mesh.metadata) mesh.metadata = {};
    mesh.metadata = {
      ...mesh.metadata,
      ...boxProperties
    };

    // Apply physics with gravity (non-zero mass = affected by gravity)
    try {
      const boxAggregate = new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX, // Use BOX shape for better performance than MESH
        {
          mass: boxProperties.mass,           // Non-zero mass enables gravity
          restitution: boxProperties.restitution,
          friction: boxProperties.friction
        },
        this._scene
      );

      Logger.levelLoader.info(`Applied physics to ${mesh.name} with mass: ${boxProperties.mass} (gravity enabled)`);

      // CRITICAL: Register with 2D constraint system to prevent Z-axis movement
      const sceneController = this._sceneController;
      if (sceneController.physics2DConstraintSystem && boxAggregate.body) {
        sceneController.physics2DConstraintSystem.registerPhysicsBody(boxAggregate.body, mesh.name);
        Logger.levelLoader.info(`Registered ${mesh.name} with 2D constraint system to prevent Z-axis movement`);
      } else {
        Logger.levelLoader.error(`Failed to register ${mesh.name} with 2D constraint system - physics2DConstraintSystem not available`);
      }

      // Enable collision detection for interaction with collideable meshes
      mesh.checkCollisions = true;

      // Ensure the box can collide with other physics bodies by activating physics
      if (boxAggregate.body) {
        // Add a small upward velocity to ensure physics activation and prevent falling through
        setTimeout(() => {
          if (boxAggregate.body) {
            // Note: Only apply Y velocity for activation - 2D constraint system will handle Z automatically
            boxAggregate.body.setLinearVelocity(new Vector3(0, 0.1, 0));
            Logger.levelLoader.debug(`Activated physics for ${mesh.name}`);
          }
        }, 100);
      }

      // Log the setup for debugging
      Logger.levelLoader.debug(`Box ${mesh.name} configured:`, {
        health: boxProperties.health,
        mass: boxProperties.mass,
        explosive: boxProperties.explosive,
        position: mesh.position.toString(),
        hasPhysics: !!boxAggregate.body
      });

      // Note: 2D constraints are now handled automatically by Physics2DConstraintSystem

    } catch (error) {
      Logger.levelLoader.error(`Failed to apply physics to ${mesh.name}:`, error);
    }
  }

  processTransformNodes(tnodes: TransformNode[]): void {
    tnodes.forEach((tnode) => {
      Logger.levelLoader.debug('tnode.id: ', tnode.id);

      // Handle player spawn points
      if (tnode.id.includes("PLAYER_SPAWN")) {
        Logger.levelLoader.info(`Setting up player spawn at: ${tnode.position.toString()}`);
        this._sceneController.setPlayerPos(
          tnode.position.clone(),
          tnode.metadata.gltf?.extras
        );
      }

      // Handle scene camera setup
      if (tnode.id === "SceneCamera") {
        Logger.levelLoader.debug('tnode: ', tnode);
        // Camera setup logic can be added here if needed
      }

      // Handle lighting setup
      if (tnode.id === "Light") {
        const mainLight = this._scene.lights.find(
          (light) => light.id === "Light"
        );
        if (mainLight) {
          mainLight.intensity = 2;
          Logger.levelLoader.debug('Main light intensity set to 2');
        }
      }
    });
  }
}
