import {
    AbstractAssetTask, AbstractMesh, AnimationGroup, AssetsManager, EventState, FilesInput, Mesh, MeshAssetTask, MeshBuilder, PhysicsAggregate,
    PhysicsShapeType, PickingInfo, Scene, TransformNode, Vector3
} from '@babylonjs/core';
// import { initialChunkPos, mapData } from '@ex/constants/chunksData';
import { findBy } from '@ex/utils/findBy';

// import { ChunksLoaderController } from './LoaderController';
import { SceneController } from './SceneController';
import { GlobalEventBus } from './event-bus';
import { ResourceLoaderController } from './ResourceLoaderController';
import { initialLevelName } from '@ex/constants/levels';
import { MeshProcessor, MeshDictionary } from './processors/MeshProcessor';

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
  // chunksData = mapData;
  currentLevel = initialLevelName;
  globalLoading = true;
  loaded = false;
  _scene: Scene;
  _sceneController: SceneController;
  loadedChunks: string[] = [];
  groundHitInfo?: PickingInfo;
  meshDict: MeshDictionary;
  meshProcessor: MeshProcessor;
  setLoadInfo: React.Dispatch<React.SetStateAction<{ current: number; total: number; message: string; }>>;
  constructor({
    scene,
    sceneController,
    setLoadInfo
  }: {
    scene: Scene;
    sceneController: SceneController;
    setLoadInfo: React.Dispatch<React.SetStateAction<{ current: number; total: number; message: string; }>>;
  }) {
    this.setLoadInfo = setLoadInfo;
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

    // Initialize mesh processor
    this.meshProcessor = new MeshProcessor(scene, sceneController, this.meshDict);

    // this.enableGlobalLoading();
    this._scene = scene;
    this._sceneController = sceneController;
    this.loadLevel(this.currentLevel);
    // this.loadNextChunk("x1y0", this.currentChunk);
  }
  // setGroundHitInfo(hitInfo: Array<PickingInfo>) {
  //   this.groundHitInfo = hitInfo[0];
  //   // this.decideNeedToLoad();

  //   // set current info about actual chunk we are standing on
  //   const maybeNewGroundMesh = hitInfo.find(
  //     (hit) =>
  //       hit.pickedMesh &&
  //       hit.pickedMesh.id.includes(this.meshDict.ground.id_includes)
  //   );
  //   if (!maybeNewGroundMesh || !maybeNewGroundMesh.pickedMesh) return;
  //   const maybeNewChunkName = maybeNewGroundMesh.pickedMesh.id.split("_")[0];
  //   if (maybeNewChunkName !== this.currentLevel) {
  //     this.currentLevel = maybeNewChunkName;
  //     this._sceneController.guiController?.setCurrentLocation(
  //       maybeNewChunkName
  //     );
  //     console.log("standing on the new chunk!!!");
  //   }
  // }
  // decideNeedToLoad() {
  //   // if (this.groundHitInfo && this.groundHitInfo.pickedPoint) {
  //   //   const nextChunks = this.checkPlayerAtMapEdgeAndGetNextChunks(
  //   //     this.groundHitInfo.pickedPoint
  //   //   );
  //   //   if (!nextChunks?.length) return;
  //   //   // console.log('close to these nextChunks: ', nextChunks, "this.currentChunk", this.currentChunk);
  //   //   // let directionExtensive = false;
  //   //   nextChunks.forEach((nextChunk) => {
  //   //     // directionExtensive =
  //   //     if (!!mapData[nextChunk] && !this.loadedChunks.includes(nextChunk)) {
  //   //       console.log("nextChunk: ", nextChunk);
  //   //       this.loadNextChunk(nextChunk, this.currentLevel);
  //   //       console.log("currentChunk: ", this.currentLevel);
  //   //     }
  //   //   });
  //   //   // if (!mapData[nextChunk]) {
  //   //   //   console.error(
  //   //   //     "map cannot be extended in this (" + nextChunk + ") direction!"
  //   //   //   );
  //   //   //   return;
  //   //   // }
  //   //   // if (this.loadedChunks.includes(nextChunk)) {
  //   //   //   console.warn(nextChunk," already loaded")
  //   //   //   return
  //   //   // }
  //   // }
  // }
  // extractXY(str: string) {
  //   const match = str.match(/x(-?\d+)y(-?\d+)/);
  //   // console.log("match: ", match);
  //   if (!match) return { x: null, y: null };

  //   const x = parseInt(match[1], 10);
  //   const y = parseInt(match[2], 10);

  //   return { x, y };
  // }
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
  // checkPlayerAtMapEdgeAndGetNextChunks(
  //   playerPosition: Vector3
  // ): string[] | null {
  //   // Проверяем близость к каждой границе
  //   const nearLeft = playerPosition.x <= mapBounds.minX + LOAD_THRESHOLD;
  //   const nearRight = playerPosition.x >= mapBounds.maxX - LOAD_THRESHOLD;
  //   const nearBottom = playerPosition.z <= mapBounds.minZ + LOAD_THRESHOLD;
  //   const nearTop = playerPosition.z >= mapBounds.maxZ - LOAD_THRESHOLD;

  //   // Если не близко ни к одной границе
  //   if (!(nearLeft || nearRight || nearTop || nearBottom)) {
  //     return null;
  //   }

  //   // Парсим текущие координаты чанка
  //   const parsedChunkCoords = this.extractXY(this.currentLevel);
  //   if (parsedChunkCoords.x === null || parsedChunkCoords.y === null) {
  //     console.error("Error parsing current map coordinates");
  //     return null;
  //   }

  //   const nextChunks: string[] = [];

  //   // Если близко к левой границе → добавляем чанк слева (x-1)
  //   if (nearLeft) {
  //     nextChunks.push(`x${parsedChunkCoords.x - 1}y${parsedChunkCoords.y}`);
  //   }
  //   // Если близко к правой границе → добавляем чанк справа (x+1)
  //   if (nearRight) {
  //     nextChunks.push(`x${parsedChunkCoords.x + 1}y${parsedChunkCoords.y}`);
  //   }
  //   // Если близко к нижней границе → добавляем чанк снизу (y-1)
  //   if (nearBottom) {
  //     nextChunks.push(`x${parsedChunkCoords.x}y${parsedChunkCoords.y - 1}`);
  //   }
  //   // Если близко к верхней границе → добавляем чанк сверху (y+1)
  //   if (nearTop) {
  //     nextChunks.push(`x${parsedChunkCoords.x}y${parsedChunkCoords.y + 1}`);
  //   }

  //   // Если игрок в углу, добавляем диагональные чанки
  //   if (nearLeft && nearBottom) {
  //     nextChunks.push(`x${parsedChunkCoords.x - 1}y${parsedChunkCoords.y - 1}`);
  //   }
  //   if (nearLeft && nearTop) {
  //     nextChunks.push(`x${parsedChunkCoords.x - 1}y${parsedChunkCoords.y + 1}`);
  //   }
  //   if (nearRight && nearBottom) {
  //     nextChunks.push(`x${parsedChunkCoords.x + 1}y${parsedChunkCoords.y - 1}`);
  //   }
  //   if (nearRight && nearTop) {
  //     nextChunks.push(`x${parsedChunkCoords.x + 1}y${parsedChunkCoords.y + 1}`);
  //   }

  //   return nextChunks.length > 0 ? nextChunks : null;
  // }
  disableGlobalLoading = () => {
    // useStore().removeGlobalLoading()
    const globalLoadingNode = window.document.getElementById("global-loading");
    if (!globalLoadingNode) return;
    globalLoadingNode.style.display = "none";
  };
  // enableGlobalLoading = () => {};
  // loadNextChunk = (position: string /* xNyN*/, oldPosition: string) => {
  //   // console.log("loadNextChunk position: ", position);
  //   this.loadedChunks.push(position);
  //   // const assetsManager = new AssetsManager(this._scene);
  //   // const chunkData = this.chunksData[position];
  //   // const meshTask = assetsManager.addMeshTask(
  //   //   "meshTask",
  //   //   "",
  //   //   "models/",
  //   //   `${chunkData.chunkName}.glb`
  //   // );
  //   // const textureTask = assetsManager.addTextureTask(
  //   //   "groundTexture",
  //   //   `models/${chunkData.chunkName}.png`
  //   // );
  //   // console.log("textureTask: ", textureTask);
  //   const onSuccess = (tasks: AbstractAssetTask[]) => {
  //     const meshTask = findBy(tasks, "name", "meshTask") as MeshAssetTask;

  //     // const groundTextureTask = findBy(
  //     //   tasks,
  //     //   "name",
  //     //   "groundTexture"
  //     // ) as TextureAssetTask;

  //     // console.log("tasks: ", tasks);
  //     //   const task = tasks[0] as MeshAssetTask;
  //     // console.log("meshTask: ", meshTask);

  //     // const oldPosXY = this.extractXY(oldPosition);
  //     // console.log("oldPosition: ", oldPosition);
  //     // const currPosXY = this.extractXY(position);
  //     // if (
  //     //   oldPosXY.x === null ||
  //     //   oldPosXY.y === null ||
  //     //   currPosXY.x === null ||
  //     //   currPosXY.y === null
  //     // ) {
  //     //   console.error(
  //     //     "This error very inlikely, coz we should already know our current pos and old pos, but pos: ",
  //     //     currPosXY,
  //     //     "and oldpos: ",
  //     //     oldPosXY
  //     //   );
  //     //   return;
  //     // }
  //     // const extensionDir = {
  //     //   x: oldPosXY.x - currPosXY.x,
  //     //   y: oldPosXY.y - currPosXY.y,
  //     // };
  //     this.processMeshes(
  //       position,
  //       meshTask.loadedMeshes,
  //       // groundTextureTask.texture,
  //       // extensionDir
  //     );
  //     // this.processTransformNodes(meshTask.loadedTransformNodes);
  //     // this.loadedChunks.push(position);

  //     // this.disableGlobalLoading();
  //     // this._sceneController;
  //   };
  //   const loader = new ResourceLoaderController(
  //     // this.processMeshes,
  //     // this.processTransformNodes,
  //     // this._sceneController.scene, this
  //   );
  //   const load = async () => {
  //     await loader.getResource(position, onSuccess);
  //   };
  //   load();
  //   // assetsManager.useDefaultLoadingScreen = false;
  //   // assetsManager.onFinish = onSuccess;
  //   // assetsManager.load();
  // };
  playCutsceneHandler = (animGroup: AnimationGroup) => ({
    sceneName,
    args = {}
  }: {
    sceneName: string;
    args?: Record<string, any>;
  }) => {
    // this method is called through bus. we need to bind to it all necessary data and process playing cutscene
    // if this correct animation
    if (animGroup.name === sceneName) {
      console.log("playing cutscene: ", sceneName, "with args: ", args);
      // animGroup.start(true, 1.0, animGroup.from, animGroup.to);
      // set current camera to scene camera "SceneCamera"
      // this._sceneController.game._camera.setSceneCamera(sceneName);
      let sceneCamera = this._scene.getCameraById('Camera');
      // continue searching for the camera
      if (!sceneCamera) {
        sceneCamera = this._scene.getCameraByName('Camera');
      }
      console.log('sceneCamera: ', sceneCamera);

      // need to find camera by id, coz we have multiple cameras in scene
      if (sceneCamera) {
        this._scene.activeCamera = sceneCamera;
        this._sceneController.scene.activeCamera = sceneCamera;
        animGroup.start(false, 1.0, animGroup.from, animGroup.to);
        animGroup.onAnimationGroupEndObservable.add((eventData: AnimationGroup, eventState: EventState) => {
          console.log("AnimationGroup ended: ", eventData.name, "eventState: ", eventState);
          // stop cutscene
          GlobalEventBus.emit('cutscene:stop', {
            sceneName: eventData.name,
          });
        });
      } else {
        console.error("Scene camera not found for cutscene: ", sceneName);
      }

      console.log('sceneCamera: ', sceneCamera);
      // this._scene.activeCamera = sceneCamera;
      // this._sceneController.scene.activeCamera = this._scene.getCameraByName("SceneCamera");

      // animGroup.onAnimationGroupPlayObservable.add((eventData: AnimationGroup, eventState: EventState) => {
      //   console.log("AnimationGroup started: ", eventData.name, "eventState: ", eventState);
      // });
    } else {
      console.warn(
        "cutscene animation group name does not match the requested scene name!"
      );
    }
  }
  stopCutsceneHandler = (animGroup: AnimationGroup) => ({
    sceneName,
    args = {}
  }: {
    sceneName: string;
    args?: Record<string, any>;
  }) => {
    if( animGroup.name !== sceneName) {
      console.warn("cutscene animation group name does not match the requested scene name for stop!");
      return;
    }
    // this method is called through bus. we need to bind to it all necessary data and
    // process playing cutscene
    // if (animGroup.isStarted) {
      console.log("stopping cutscene: ", animGroup.name);
      animGroup.stop();
      animGroup.reset()
      // this._sceneController.game._camera.setGroundMesh(this.meshDict.ground.mesh);
      // this._sceneController.game._camera.camera.setTarget(this.meshDict.ground.mesh.position);
      this._scene.activeCamera = this._scene.getCameraById('camera');
      this._sceneController.scene.activeCamera = this._scene.getCameraById('camera');
    // } else {
      // console.warn(
      //   "cutscene animation group is not started, cannot stop it: ",
      //   animGroup.name
      // );
    // }
  }

  private loadLevel = (levelName: string /* xNyN*/) => {
    console.log('loadLevel: ', levelName);
    const onSuccess = (meshBlob: Blob) => {
      const assetsManager = new AssetsManager(this._sceneController.scene);
    assetsManager.useDefaultLoadingScreen = false;
    // const meshBlob = await this.getLevelBlob(levelName, "glb");

      // this._sceneController.guiController?.setCurrentLocation(levelName);
    // const tasks: AbstractAssetTask[] = []
        FilesInput.FilesToLoad[`${levelName}-ground-mesh.glb`] = meshBlob as File;
        const meshTask = assetsManager.addMeshTask(
      "meshTask",
      "",
      "file:",
      `${levelName}-ground-mesh.glb`
    );
    //     const meshTask = assetsManager.addMeshTask(
    //   "meshTask",
    //   "",
    //   "file:",
    //   `${levelName}-ground-mesh.glb`
    // );

    // 2) Загружаем PNG
    // const textureBlob = await this.getChunkBlob(position, "png");
    // FilesInput.FilesToLoad[`${position}-ground-texture.png`] =
    //   textureBlob as File;
    // const textureURL = URL.createObjectURL(textureBlob);
    // const textureTask = assetsManager.addTextureTask(
    //   "groundTexture",
    //   textureURL
    // );

    assetsManager.onFinish = (tasks)=>{

      console.log('tasks: ', tasks);
      this.loadedChunks.push(levelName);
      const meshTask = findBy(tasks, "name", "meshTask") as MeshAssetTask;
      console.log('meshTask: ', meshTask);
      meshTask.loadedAnimationGroups.forEach((animGroup) => {
        console.log('animGroup: ', animGroup);
        animGroup.stop(true)
        GlobalEventBus.on('cutscene:trigger', this.playCutsceneHandler(animGroup));
        GlobalEventBus.on('cutscene:stop', this.stopCutsceneHandler(animGroup));
        // animGroup.isAdditive = false;
        // animGroup._shouldStart = true;
        // animGroup.playOrder = 3
        // console.log('animGroup: ', animGroup);
        // animGroup.dispose()
        // console.log('animGroup.isStarted: ', animGroup.isStarted);
        // animGroup.onAnimationGroupPlayObservable.add((eventData: AnimationGroup, eventState: EventState) => {
        //   console.log("AnimationGroup started: ", eventData.name, "eventState: ", eventState);
        // });

      });
      // const groundTextureTask = findBy(
      //   tasks,
      //   "name",
      //   "groundTexture"
      // ) as TextureAssetTask;

      // console.log("tasks: ", tasks);
      // console.log("meshTask: ", meshTask);

      this.meshProcessor.processMeshes(
        levelName,
        meshTask.loadedMeshes,
        // groundTextureTask.texture
      );
      this.meshProcessor.processTransformNodes(meshTask.loadedTransformNodes);

      this.disableGlobalLoading();
      this._sceneController;
    };
    assetsManager.onTaskError = (task: AbstractAssetTask) => {
      console.error("Error loading task: ", task.name, task.errorObject);
      this.setLoadInfo({
        current: 0,
        total: 0,
        message: `Error loading task: ${task.name}`
      });
    };
    assetsManager.load();

    };
        const loader = new ResourceLoaderController(
      // this.processMeshes,
      // this.processTransformNodes,
      // this._sceneController.scene, this
    );
    loader.getResource(levelName, onSuccess);
    // const loader = new ChunksLoaderController(
    //   // this.processMeshes,
    //   onSuccess,
    //   // this.processTransformNodes,
    //   this._sceneController.scene,
    //   this
    // );
    // const load = async () => {
    //   await loader.loadChunk(levelName);
    // };
    // load();
  };
}
