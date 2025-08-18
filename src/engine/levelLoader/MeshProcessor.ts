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
  private shadowCasterQueue: Mesh[] = [];
  private shadowGeneratorReady = false;

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
      // CRITICAL: Normalize Z position to 0 for all meshes to ensure 2D gameplay
      // This prevents the constraint system from fighting with non-zero Z positions
      mesh.position.z = 0;

      // this._sceneController.addShadowCaster(mesh as Mesh);
      Logger.levelLoader.debug('mesh.metadata.gltf?.extras: ', mesh.metadata?.gltf?.extras?.collideable === true);

      // Handle collision detection for meshes with collideable metadata or death planes
      if (mesh.metadata?.gltf?.extras?.collideable === true || mesh.name === 'death plane') {
        mesh.checkCollisions = true;
        const groundAggregate = new PhysicsAggregate(
          mesh,
          PhysicsShapeType.MESH,
          {
            mass: 0,        // Static ground
            friction: 0.1,  // Low friction to enable wall jumps - movement control handles "stickiness"
            restitution: 0.1 // Small bounce for more realistic ground
          },
          this._sceneController.scene
        );
        mesh.receiveShadows = true; // Enable shadows for ground mesh

        Logger.levelLoader.info(`Collideable mesh physics created for: ${mesh.name} (mass: 0, friction: 0.1)`);

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

      // Handle physics boxes (destructible objects from level files)
      if (this.isPhysicsBox(mesh)) {
        Logger.levelLoader.info(`🎁 Found physics box: ${mesh.name}`);
        this.setupPhysicsBox(mesh);
        // this._sceneController.addShadowCaster(mesh as Mesh);
      } else {
        // Log all mesh names to help debug which meshes are available
        Logger.levelLoader.debug(`📦 Non-box mesh found: ${mesh.name}`);
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
    groundMesh.receiveShadows = true; // Enable shadows on ground mesh
    // Create physics aggregate for ground
    const groundAggregate = new PhysicsAggregate(
      groundMesh,
      PhysicsShapeType.MESH,
      { mass: 0, friction: 1 }, // Low friction to enable wall jumps
      this._sceneController.scene
    );
  }

  /**
   * Check if a mesh is a physics box based on name patterns
   */
  private isPhysicsBox(mesh: AbstractMesh): boolean {
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

    return boxNamePatterns.some(pattern => pattern.test(mesh.name));
  }

  /**
   * Setup physics and game object properties for a box mesh
   */
  private setupPhysicsBox(mesh: AbstractMesh): void {
    // CRITICAL: Ensure box is positioned at Z=0 for 2D gameplay
    mesh.position.z = 0;

    Logger.levelLoader.info(`🔧 Setting up physics box: ${mesh.name} at Z=0`);
    Logger.levelLoader.info(`📍 Box position: ${mesh.position.toString()}`);

    /*
      private setupProjectileBox(mesh: AbstractMesh): void {
    Logger.levelLoader.info(`Setting up projectile box: ${mesh.name}`);

    // Extract properties from GLTF extras
    const gltfExtras = mesh.metadata?.gltf?.extras || {};

    // Default values if not specified in GLTF extras
      isEnvironment: gltfExtras.isEnvironment !== undefined ? gltfExtras.isEnvironment : true,
      health: gltfExtras.health || 50,
      mass: gltfExtras.mass || 10,
      destructible: gltfExtras.destructible !== undefined ? gltfExtras.destructible : true,
      explosive: gltfExtras.explosive !== undefined ? gltfExtras.explosive : false,
      restitution: gltfExtras.restitution || 0.3, // Bounciness
      friction: gltfExtras.friction || 0.8        // Surface friction

    */
    const gltfExtras = mesh.metadata?.gltf?.extras || {};

    // Box properties for GLB objects loaded from level files
    const boxProperties = {
      health: gltfExtras.health || 50 ,  // CRITICAL: Required for explosion system to detect GLB boxes
      mass: gltfExtras.mass || 1,
      restitution: gltfExtras.restitution || 0.3,
      friction: gltfExtras.friction || 0.8,
    };

    Logger.levelLoader.info(`🩺 Box health metadata: ${boxProperties.health} HP for ${mesh.name}`);

    // Update mesh metadata for explosion system compatibility
    if (!mesh.metadata) mesh.metadata = {};
    mesh.metadata = {
      ...boxProperties,
      // CRITICAL: Mark this as a GLB box for coordinate system handling
      isGLBBox: true,
      sourceType: 'GLB_LEVEL_FILE',
      gltf: {
        extras: {
          collideable: true,
        },
      },
      // Set current health equal to max health initially
      currentHealth: boxProperties.health
    };

    // Apply physics with gravity
    try {
      const boxAggregate = new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX,
        boxProperties,
        this._sceneController.scene
      );
      mesh.checkCollisions = true;
      mesh.receiveShadows = true; // Enable shadows on box mesh

      // CRITICAL: Register with 2D constraint system to prevent Z-axis movement
      const sceneController = this._sceneController;
      if (sceneController.physics2DConstraintSystem && boxAggregate.body) {
        sceneController.physics2DConstraintSystem.registerPhysicsBody(boxAggregate.body, mesh.name);
      }

      // Add mesh as shadow caster if shadow generator is initialized, else queue it
      if (this.shadowGeneratorReady && typeof this._sceneController.addShadowCaster === "function") {
        this._sceneController.addShadowCaster(mesh as Mesh);
      } else {
        this.shadowCasterQueue.push(mesh as Mesh);
        Logger.levelLoader.warn(`Shadow generator not initialized yet, queued ${mesh.name} as shadow caster`);
      }

      if (boxAggregate.body) {
        // CRITICAL: Store physics body reference for explosion system
        mesh.physicsBody = boxAggregate.body;

        // Set low linear damping but very high angular damping to prevent spinning
        if (boxAggregate.body.setLinearDamping) {
          boxAggregate.body.setLinearDamping(0.05);  // Low linear damping - stays responsive
          boxAggregate.body.setAngularDamping(0.9);  // Very high angular damping - minimal spinning
        }

        // Activate physics with small upward velocity
        setTimeout(() => {
          if (boxAggregate.body) {
            boxAggregate.body.setLinearVelocity(new Vector3(0, 0.1, 0));
          }
        }, 100);

        // Store backup reference for debugging if needed
        mesh.metadata.physicsBody = boxAggregate.body;

        // Create health bar for this box with retry logic
        const createHealthBarWithRetry = (retryCount = 0) => {
          if (this._sceneController.healthBarSystem && mesh.metadata.health) {
            this._sceneController.healthBarSystem.createHealthBar(mesh);
            Logger.levelLoader.info(`Created health bar for ${mesh.name} with ${mesh.metadata.health} HP`);
          } else if (retryCount < 5) {
            // Retry after a longer delay if health bar system isn't ready
            Logger.levelLoader.warn(`Health bar system not ready for ${mesh.name}, retrying... (attempt ${retryCount + 1})`);
            setTimeout(() => createHealthBarWithRetry(retryCount + 1), 500);
          } else {
            Logger.levelLoader.error(`Failed to create health bar for ${mesh.name} after 5 attempts`);
          }
        };

        setTimeout(createHealthBarWithRetry, 200);
      }

    } catch (error) {
      Logger.levelLoader.error(`Failed to apply physics to ${mesh.name}:`, error);
    }
  }  processTransformNodes(tnodes: TransformNode[]): void {
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
          mainLight.shadowEnabled = true; // Enable shadows for the main light
          Logger.levelLoader.debug('Main light intensity set to 2');
        }
      }
    });
  }

  /**
   * Call this when the shadow generator is initialized.
   * Pass the sceneController so we can flush the queue.
   */
  flushShadowCasterQueue() {
    if (!this.shadowGeneratorReady && typeof this._sceneController.addShadowCaster === "function") {
      this.shadowGeneratorReady = true;
      this.shadowCasterQueue.forEach(mesh => {
        this._sceneController.addShadowCaster(mesh);
      });
      this.shadowCasterQueue = [];
    }
  }
}
