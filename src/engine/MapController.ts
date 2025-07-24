import {
  AbstractAssetTask,
  AbstractMesh,
  AssetsManager,
  MeshAssetTask,
  MeshBuilder,
  Observable,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Texture,
  TextureAssetTask,
  TransformNode,
} from "@babylonjs/core";
import { initialChunkPos, mapData } from "@ex/constants/chunksData";
import { useStore } from "@ex/zustand/store";
import { SceneController } from "./SceneController";
// import { callAndEnsure, findByIdIncludes } from "@ex/utils/getById";

export class MapController {
  chunksData = mapData;
  currentChunk = initialChunkPos;
  globalLoading = true;
  loaded = false;
  _scene: Scene;
  _sceneController: SceneController;
  // defaultMesh
  meshDict;
  constructor({
    scene,
    sceneController,
  }: {
    scene: Scene;
    sceneController: SceneController;
  }) {
    const defaultMesh = MeshBuilder.CreateBox("ground", {
      size: 2,
    }) as AbstractMesh;
      defaultMesh.position.y = -20
    this.meshDict = {
      ground: {
        id_includes: "GROUND",
        mesh: defaultMesh,
      },
      };


    this.enableGlobalLoading();
    this._scene = scene;
    this._sceneController = sceneController;
    this.loadChunk(this.currentChunk);
  }
  disableGlobalLoading = () => {
    // useStore().removeGlobalLoading()
    const globalLoadingNode = window.document.getElementById("global-loading");
    if (!globalLoadingNode) return;
    globalLoadingNode.style.display = "none";
  };
  processMeshes(meshes: AbstractMesh[], texture: Texture) {
    meshes.forEach((mesh) => {
      if (mesh.id.includes(this.meshDict.ground.id_includes)) {
        this.meshDict.ground.mesh = mesh;
      }
    });

    //   add ground material
    const roofMat = new StandardMaterial("roofMat", this._scene);
    roofMat.diffuseTexture = texture;
      this.meshDict.ground.mesh.material = roofMat;
      this.meshDict.ground.mesh.checkCollisions = true
      const groundAggregate = new PhysicsAggregate(this.meshDict.ground.mesh, PhysicsShapeType.MESH, { mass: 0 }, this._scene);
  }
  processTransformNodes(tnodes: TransformNode[]) {
    console.log("tnodes: ", tnodes);
    tnodes.forEach((tnode) => {
      if (tnode.id.includes("PLAYER_SPAWN")) {
        console.log("tnode: ", tnode);
        this._sceneController.setPlayerPos(
          tnode.position.clone(),
          tnode.metadata.gltf.extras
        );
        }

        if (tnode.id === 'Light') {
            console.log('tnode.id: ', tnode.id);
            console.log('this._scene.lights: ', this._scene.lights);
            const mainLight = this._scene.lights.find(light => light.id === 'Light')
            if (mainLight) {
                mainLight.intensity = 2
            }
        }
    });
  }
  enableGlobalLoading = () => {};
  private loadChunk = (position: string /* xNyN*/) => {
    const assetsManager = new AssetsManager(this._scene);
    const chunkData = this.chunksData[position];
    const meshTask = assetsManager.addMeshTask(
      "meshTask",
      "",
      "models/",
      `${chunkData.chunkName}.glb`
    );
    const textureTask = assetsManager.addTextureTask(
      "groundTexture",
      `models/${chunkData.chunkName}.png`
    );
    console.log("textureTask: ", textureTask);
    const onSuccess = (tasks: AbstractAssetTask[]) => {
      const meshTask = tasks.find(
        (task) => task.name === "meshTask"
      ) as MeshAssetTask;
      const groundTextureTask = tasks.find(
        (task) => task.name === "groundTexture"
      ) as TextureAssetTask;

      if (!meshTask || !groundTextureTask)
        throw new Error("No meshTask or no Texture task!");
      console.log("tasks: ", tasks);
      //   const task = tasks[0] as MeshAssetTask;
      console.log("meshTask: ", meshTask);

      this.processMeshes(meshTask.loadedMeshes, groundTextureTask.texture);
      this.processTransformNodes(meshTask.loadedTransformNodes);

      this.disableGlobalLoading();
      this._sceneController;
    };

    assetsManager.useDefaultLoadingScreen = false;
    assetsManager.onFinish = onSuccess;
    assetsManager.load();
  };
}
