import {
  AbstractAssetTask,
  AbstractMesh,
  AssetsManager,
  MeshAssetTask,
  MeshBuilder,
  Observable,
  PhysicsAggregate,
  PhysicsShapeType,
  PickingInfo,
  Scene,
  StandardMaterial,
  Texture,
  TextureAssetTask,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { initialChunkPos, mapData } from "@ex/constants/chunksData";
import { useStore } from "@ex/zustand/store";
import { SceneController } from "./SceneController";
// import { callAndEnsure, findByIdIncludes } from "@ex/utils/getById";

const mapBounds = {
  minX: -100, // по точке 1 (x)
  maxX: 100, // по точке 3 (x)
  minZ: -100, // по точке 1 (z)
  maxZ: 100, // по точке 3 (z)
};
// Пороговое расстояние для загрузки нового чанка
const LOAD_THRESHOLD = 10.0;

export class MapController {
  chunksData = mapData;
  currentChunk = initialChunkPos;
  globalLoading = true;
  loaded = false;
  _scene: Scene;
  _sceneController: SceneController;
  groundHitInfo?: PickingInfo;
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
    defaultMesh.position.y = -20;
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
  setGroundHitInfo(hitInfo: Array<PickingInfo>) {
    this.groundHitInfo = hitInfo[0];
    this.decideNeedToLoad();
  }
  decideNeedToLoad() {
    if (this.groundHitInfo && this.groundHitInfo.pickedPoint) {
      const nextChunk = this.checkPlayerAtMapEdgeAndGetNextChunk(
        this.groundHitInfo.pickedPoint
      );
      if (!nextChunk) return;
      if (!mapData[nextChunk]) {
        console.error("map cannot be extended in this ("+nextChunk+") direction!")
        return
      }
      this.loadNextChunk(nextChunk, this.currentChunk)
      console.log("currentChunk: ", this.currentChunk);
      console.log("nextChunk: ", nextChunk);
    }
  }
  extractXY(str: string) {
    const match = str.match(/x(-?\d+)y(-?\d+)/);
    console.log("match: ", match);
    if (!match) return { x: null, y: null };

    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);

    return { x, y };
  }
  checkPlayerAtMapEdgeAndGetNextChunk(playerPosition: Vector3) {
    // Проверяем близость к каждой границе
    const nearLeft = playerPosition.x <= mapBounds.minX + LOAD_THRESHOLD;
    const nearRight = playerPosition.x >= mapBounds.maxX - LOAD_THRESHOLD;
    const nearBottom = playerPosition.z <= mapBounds.minZ + LOAD_THRESHOLD;
    const nearTop = playerPosition.z >= mapBounds.maxZ - LOAD_THRESHOLD;

    // Если не близко ни к одной границе
    if (!(nearLeft || nearRight || nearTop || nearBottom)) {
      return null;
    }

    const parsedChunkCoords = this.extractXY(this.currentChunk);
    if (parsedChunkCoords.x === null || parsedChunkCoords.y === null) {
      console.error(
        "Error parsing current map coordinates, altough we know them and can do it any time!!!"
      );
      return;
    }
    // Определяем направление
    let directionX = parsedChunkCoords.x;
    let directionY = parsedChunkCoords.y;
    if (nearLeft) directionX -= 1; // Запад (влево)
    if (nearRight) directionX += 1; // Восток (вправо)
    if (nearTop) directionY += 1; // Север (вверх)
    if (nearBottom) directionY -= 1; // Юг (вниз)

    // Возвращаем результат в формате { direction: 'WN', coordinates: 'xNyN' }
    return `x${directionX}y${directionY}`;
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
    this.meshDict.ground.mesh.checkCollisions = true;
    const groundAggregate = new PhysicsAggregate(
      this.meshDict.ground.mesh,
      PhysicsShapeType.MESH,
      { mass: 0 },
      this._scene
    );
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

      if (tnode.id === "Light") {
        console.log("tnode.id: ", tnode.id);
        console.log("this._scene.lights: ", this._scene.lights);
        const mainLight = this._scene.lights.find(
          (light) => light.id === "Light"
        );
        if (mainLight) {
          mainLight.intensity = 2;
        }
      }
    });
  }
  enableGlobalLoading = () => { };
  loadNextChunk= (position: string /* xNyN*/, oldPosition: string) => {
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

      // this.processMeshes(meshTask.loadedMeshes, groundTextureTask.texture);
      // this.processTransformNodes(meshTask.loadedTransformNodes);

      // this.disableGlobalLoading();
      // this._sceneController;
    };

    assetsManager.useDefaultLoadingScreen = false;
    assetsManager.onFinish = onSuccess;
    assetsManager.load();
  };
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
