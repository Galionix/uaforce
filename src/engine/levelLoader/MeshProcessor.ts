import {
  AbstractMesh,
  Mesh,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  TransformNode,
} from '@babylonjs/core';
import { SceneController } from '../SceneController';

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
      console.log('mesh.metadata.gltf?.extras: ', mesh.metadata?.gltf?.extras?.collideable === true);
      
      // Handle collision detection for meshes with collideable metadata
      if (mesh.metadata?.gltf?.extras?.collideable === true) {
        mesh.checkCollisions = true;
        const groundAggregate = new PhysicsAggregate(
          mesh,
          PhysicsShapeType.MESH,
          { mass: 0, friction: 0 },
          this._scene
        );
      }

      // Handle ground meshes
      mesh.id = `${chunkXY}_${mesh.id}`;
      if (mesh.id.includes(this.meshDict.ground.id_includes)) {
        this.meshDict.ground.allMeshes.push(mesh);
        
        if (!extensionDir) {
          this.meshDict.ground.mesh = mesh;
          groundMesh = mesh;
        } else {
          groundMesh = mesh;
          console.log("extensionDir: ", extensionDir);
          mesh.position.x = extensionDir.x * 100;
          mesh.position.z = extensionDir.y * -100;
        }
      }
    });

    console.log("groundMesh: ", groundMesh);
    
    if (groundMesh) {
      this.setupGroundMesh(groundMesh);
    }

    return groundMesh;
  }

  private setupGroundMesh(groundMesh: AbstractMesh): void {
    // Set up camera ground mesh reference
    this._sceneController.game._camera.setGroundMesh(groundMesh as Mesh);
    
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
      console.log('tnode.id: ', tnode.id);
      
      // Handle player spawn points
      if (tnode.id.includes("PLAYER_SPAWN")) {
        this._sceneController.setPlayerPos(
          tnode.position.clone(),
          tnode.metadata.gltf?.extras
        );
      }
      
      // Handle scene camera setup
      if (tnode.id === "SceneCamera") {
        console.log('tnode: ', tnode);
        // Camera setup logic can be added here if needed
      }
      
      // Handle lighting setup
      if (tnode.id === "Light") {
        const mainLight = this._scene.lights.find(
          (light) => light.id === "Light"
        );
        if (mainLight) {
          mainLight.intensity = 2;
        }
      }
    });
  }
}
