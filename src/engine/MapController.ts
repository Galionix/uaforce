import {
    AbstractAssetTask, AbstractMesh, AssetsManager, Mesh, MeshAssetTask, MeshBuilder,
    PhysicsAggregate, PhysicsShapeType, PickingInfo, Scene, StandardMaterial, Texture,
    TextureAssetTask, TransformNode, Vector3
} from '@babylonjs/core';
import { initialChunkPos, mapData } from '@ex/constants/chunksData';
import { findBy } from '@ex/utils/findBy';

import { SceneController } from './SceneController';

// import { callAndEnsure, findByIdIncludes } from "@ex/utils/getById";

const mapBounds = {
  minX: -100, // по точке 1 (x)
  maxX: 100, // по точке 3 (x)
  minZ: -100, // по точке 1 (z)
  maxZ: 100, // по точке 3 (z)
};
// Пороговое расстояние для загрузки нового чанка
const LOAD_THRESHOLD = 70.0;

export class MapController {
  chunksData = mapData;
  currentChunk = initialChunkPos;
  globalLoading = true;
  loaded = false;
  _scene: Scene;
  _sceneController: SceneController;
  loadedChunks: string[] = [];
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
        allMeshes: [] as AbstractMesh[],
      },
    };

    this.enableGlobalLoading();
    this._scene = scene;
    this._sceneController = sceneController;
    this.loadChunk(this.currentChunk);
    // this.loadNextChunk("x1y0", this.currentChunk);
  }
  setGroundHitInfo(hitInfo: Array<PickingInfo>) {
    this.groundHitInfo = hitInfo[0];
    this.decideNeedToLoad();

    // set current info about actual chunk we are standing on
    const maybeNewGroundMesh = hitInfo.find(hit => hit.pickedMesh && hit.pickedMesh.id.includes(this.meshDict.ground.id_includes))
    if (!maybeNewGroundMesh || !maybeNewGroundMesh.pickedMesh) return
    const maybeNewChunkName = maybeNewGroundMesh.pickedMesh.id.split("_")[0]
    if (maybeNewChunkName !== this.currentChunk) {
      this.currentChunk = maybeNewChunkName
      this._sceneController.guiController?.setCurrentLocation(maybeNewChunkName)
    console.log("standing on the new chunk!!!")
  }
  }
  decideNeedToLoad() {
    if (this.groundHitInfo && this.groundHitInfo.pickedPoint) {
      const nextChunks = this.checkPlayerAtMapEdgeAndGetNextChunks(
        this.groundHitInfo.pickedPoint
      );
      if (!nextChunks?.length) return;
      // console.log('close to these nextChunks: ', nextChunks, "this.currentChunk", this.currentChunk);
      // let directionExtensive = false;
      nextChunks.forEach((nextChunk) => {
        // directionExtensive =
        if (!!mapData[nextChunk] && !this.loadedChunks.includes(nextChunk)) {
          console.log('nextChunk: ', nextChunk);
          this.loadNextChunk(nextChunk, this.currentChunk);
          console.log("currentChunk: ", this.currentChunk);
        }
      });
      // if (!mapData[nextChunk]) {
      //   console.error(
      //     "map cannot be extended in this (" + nextChunk + ") direction!"
      //   );
      //   return;
      // }
      // if (this.loadedChunks.includes(nextChunk)) {
      //   console.warn(nextChunk," already loaded")
      //   return
      // }

    }
  }
  extractXY(str: string) {
    const match = str.match(/x(-?\d+)y(-?\d+)/);
    // console.log("match: ", match);
    if (!match) return { x: null, y: null };

    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);

    return { x, y };
  }
  // checkPlayerAtMapEdgeAndGetNextChunk(playerPosition: Vector3) {
  //   // Проверяем близость к каждой границе
  //   const nearLeft = playerPosition.x <= mapBounds.minX + LOAD_THRESHOLD;
  //   const nearRight = playerPosition.x >= mapBounds.maxX - LOAD_THRESHOLD;
  //   const nearBottom = playerPosition.z <= mapBounds.minZ + LOAD_THRESHOLD;
  //   const nearTop = playerPosition.z >= mapBounds.maxZ - LOAD_THRESHOLD;

  //   // Если не близко ни к одной границе
  //   if (!(nearLeft || nearRight || nearTop || nearBottom)) {
  //     return null;
  //   }

  //   const parsedChunkCoords = this.extractXY(this.currentChunk);
  //   if (parsedChunkCoords.x === null || parsedChunkCoords.y === null) {
  //     console.error(
  //       "Error parsing current map coordinates, altough we know them and can do it any time!!!"
  //     );
  //     return;
  //   }
  //   // Определяем направление
  //   let directionX = parsedChunkCoords.x;
  //   let directionY = parsedChunkCoords.y;
  //   if (nearLeft) directionX -= 1; // Запад (влево)
  //   if (nearRight) directionX += 1; // Восток (вправо)
  //   if (nearTop) directionY += 1; // Север (вверх)
  //   if (nearBottom) directionY -= 1; // Юг (вниз)

  //   // Возвращаем результат в формате { direction: 'WN', coordinates: 'xNyN' }
  //   return `x${directionX}y${directionY}`;
  // }
  checkPlayerAtMapEdgeAndGetNextChunks(
    playerPosition: Vector3
  ): string[] | null {
    // Проверяем близость к каждой границе
    const nearLeft = playerPosition.x <= mapBounds.minX + LOAD_THRESHOLD;
    const nearRight = playerPosition.x >= mapBounds.maxX - LOAD_THRESHOLD;
    const nearBottom = playerPosition.z <= mapBounds.minZ + LOAD_THRESHOLD;
    const nearTop = playerPosition.z >= mapBounds.maxZ - LOAD_THRESHOLD;

    // Если не близко ни к одной границе
    if (!(nearLeft || nearRight || nearTop || nearBottom)) {
      return null;
    }

    // Парсим текущие координаты чанка
    const parsedChunkCoords = this.extractXY(this.currentChunk);
    if (parsedChunkCoords.x === null || parsedChunkCoords.y === null) {
      console.error("Error parsing current map coordinates");
      return null;
    }

    const nextChunks: string[] = [];

    // Если близко к левой границе → добавляем чанк слева (x-1)
    if (nearLeft) {
      nextChunks.push(`x${parsedChunkCoords.x - 1}y${parsedChunkCoords.y}`);
    }
    // Если близко к правой границе → добавляем чанк справа (x+1)
    if (nearRight) {
      nextChunks.push(`x${parsedChunkCoords.x + 1}y${parsedChunkCoords.y}`);
    }
    // Если близко к нижней границе → добавляем чанк снизу (y-1)
    if (nearBottom) {
      nextChunks.push(`x${parsedChunkCoords.x}y${parsedChunkCoords.y - 1}`);
    }
    // Если близко к верхней границе → добавляем чанк сверху (y+1)
    if (nearTop) {
      nextChunks.push(`x${parsedChunkCoords.x}y${parsedChunkCoords.y + 1}`);
    }

    // Если игрок в углу, добавляем диагональные чанки
    if (nearLeft && nearBottom) {
      nextChunks.push(`x${parsedChunkCoords.x - 1}y${parsedChunkCoords.y - 1}`);
    }
    if (nearLeft && nearTop) {
      nextChunks.push(`x${parsedChunkCoords.x - 1}y${parsedChunkCoords.y + 1}`);
    }
    if (nearRight && nearBottom) {
      nextChunks.push(`x${parsedChunkCoords.x + 1}y${parsedChunkCoords.y - 1}`);
    }
    if (nearRight && nearTop) {
      nextChunks.push(`x${parsedChunkCoords.x + 1}y${parsedChunkCoords.y + 1}`);
    }

    return nextChunks.length > 0 ? nextChunks : null;
  }
  disableGlobalLoading = () => {
    // useStore().removeGlobalLoading()
    const globalLoadingNode = window.document.getElementById("global-loading");
    if (!globalLoadingNode) return;
    globalLoadingNode.style.display = "none";
  };
  processMeshes(
    chunkXY: string,
    meshes: AbstractMesh[],
    texture: Texture,
    extensionDir?: {
      x: number;
      y: number;
    }
  ) {
    let groundMesh: AbstractMesh | null = null;

    meshes.forEach((mesh) => {
      mesh.id = `${chunkXY}_${mesh.id} `;
      if (mesh.id.includes(this.meshDict.ground.id_includes)) {
        this.meshDict.ground.allMeshes.push(mesh);
        if (!extensionDir) {
          this.meshDict.ground.mesh = mesh;
          groundMesh = mesh;
        } else {
          groundMesh = mesh;
          console.log("extensionDir: ", extensionDir);
          mesh.position.x = extensionDir.x * 200;
          mesh.position.z = extensionDir.y * -200;
        }
      }
      console.log("mesh.id: ", mesh.id);
    });

    console.log("groundMesh: ", groundMesh);
    if (!groundMesh) return;
    //   add ground material
    const roofMat = new StandardMaterial("roofMat", this._scene);
    roofMat.diffuseTexture = texture;
    (groundMesh as Mesh).material = roofMat;
    (groundMesh as Mesh).checkCollisions = true;
    // (groundMesh as Mesh).phy
    const groundAggregate = new PhysicsAggregate(
      groundMesh,
      PhysicsShapeType.MESH,
      { mass: 0, friction: 1 },
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
  enableGlobalLoading = () => {};
  loadNextChunk = (position: string /* xNyN*/, oldPosition: string) => {
    this.loadedChunks.push(position);
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
      const meshTask = findBy(tasks, 'name','meshTask') as MeshAssetTask

      const groundTextureTask = findBy(tasks,'name', 'groundTexture') as TextureAssetTask

      console.log("tasks: ", tasks);
      //   const task = tasks[0] as MeshAssetTask;
      console.log("meshTask: ", meshTask);

      const oldPosXY = this.extractXY(oldPosition);
      console.log("oldPosition: ", oldPosition);
      const currPosXY = this.extractXY(position);
      if (
        oldPosXY.x === null ||
        oldPosXY.y === null ||
        currPosXY.x === null ||
        currPosXY.y === null
      ) {
        console.error(
          "This error very inlikely, coz we should already know our current pos and old pos, but pos: ",
          currPosXY,
          "and oldpos: ",
          oldPosXY
        );
        return;
      }
      const extensionDir = {
        x: oldPosXY.x - currPosXY.x,
        y: oldPosXY.y - currPosXY.y,
      };
      this.processMeshes(
        position,
        meshTask.loadedMeshes,
        groundTextureTask.texture,
        extensionDir
      );
      // this.processTransformNodes(meshTask.loadedTransformNodes);

      // this.disableGlobalLoading();
      // this._sceneController;
    };

    assetsManager.useDefaultLoadingScreen = false;
    assetsManager.onFinish = onSuccess;
    assetsManager.load();
  };
  private loadChunk = (position: string /* xNyN*/) => {

    const strtategyTest = async () => {

      const res = await this.loadChunkServerStrategy(position)
      console.log('res: ', res);
    }
    strtategyTest()
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
      this._sceneController.guiController?.setCurrentLocation(position)

      this.loadedChunks.push(position);
      const meshTask = findBy(tasks, 'name','meshTask') as MeshAssetTask

      const groundTextureTask = findBy(tasks,'name', 'groundTexture') as TextureAssetTask

      console.log("tasks: ", tasks);
      console.log("meshTask: ", meshTask);

      this.processMeshes(
        position,
        meshTask.loadedMeshes,
        groundTextureTask.texture
      );
      this.processTransformNodes(meshTask.loadedTransformNodes);

      this.disableGlobalLoading();
      this._sceneController;
    };

    assetsManager.useDefaultLoadingScreen = false;
    assetsManager.onFinish = onSuccess;
    assetsManager.load();
  };

  async loadChunkServerStrategy(chunkId: string) {
 // 1. Проверка кеша
    // const cached = await getFromIndexedDB(chunkId);
    // if (cached) return cached;

    // 2. Запрос к вашему серверу
    const response = await fetch(`/api/chunks/${chunkId}`, {
      headers: {
        Authorization: `Bearer ${`userToken`}`,
      },
    });

    if (!response.ok) throw new Error('Chunk load failed');

    // 3. Сохранение в кеш
    const blob = await response.blob();
    // await saveToIndexedDB(chunkId, blob);

    return blob;
  }
}
