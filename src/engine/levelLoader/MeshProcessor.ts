import {
  AbstractMesh,
  Mesh,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  TransformNode,
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
          { mass: 0, friction: 0 },
          this._scene
        );

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
