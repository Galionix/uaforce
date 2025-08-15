import {
  AbstractAssetTask,
  AbstractMesh,
  AnimationGroup,
  AssetsManager,
  EventState,
  FilesInput,
  Mesh,
  MeshAssetTask,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PickingInfo,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { findBy } from "@ex/utils/findBy";

import { SceneController } from "../SceneController";
import { GlobalEventBus } from "../event-bus";
import { ResourceLoaderController } from "../ResourceLoaderController";
import { initialLevelName } from "@ex/constants/levels";
import { MeshProcessor, MeshDictionary } from "./MeshProcessor";

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
  setLoadInfo: React.Dispatch<
    React.SetStateAction<{ current: number; total: number; message: string }>
  >;
  constructor({
    scene,
    sceneController,
    setLoadInfo,
  }: {
    scene: Scene;
    sceneController: SceneController;
    setLoadInfo: React.Dispatch<
      React.SetStateAction<{ current: number; total: number; message: string }>
    >;
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
    this.meshProcessor = new MeshProcessor(
      scene,
      sceneController,
      this.meshDict
    );

    // this.enableGlobalLoading();
    this._scene = scene;
    this._sceneController = sceneController;
    this.loadLevel(this.currentLevel);
    // this.loadNextChunk("x1y0", this.currentChunk);
  }

  disableGlobalLoading = () => {
    // useStore().removeGlobalLoading()
    const globalLoadingNode = window.document.getElementById("global-loading");
    if (!globalLoadingNode) return;
    globalLoadingNode.style.display = "none";
  };

  playCutsceneHandler =
    (animGroup: AnimationGroup) =>
    ({
      sceneName,
      args = {},
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
        let sceneCamera = this._scene.getCameraById("Camera");
        // continue searching for the camera
        if (!sceneCamera) {
          sceneCamera = this._scene.getCameraByName("Camera");
        }
        console.log("sceneCamera: ", sceneCamera);

        // need to find camera by id, coz we have multiple cameras in scene
        if (sceneCamera) {
          this._scene.activeCamera = sceneCamera;
          this._sceneController.scene.activeCamera = sceneCamera;
          animGroup.start(false, 1.0, animGroup.from, animGroup.to);
          animGroup.onAnimationGroupEndObservable.add(
            (eventData: AnimationGroup, eventState: EventState) => {
              console.log(
                "AnimationGroup ended: ",
                eventData.name,
                "eventState: ",
                eventState
              );
              // stop cutscene
              GlobalEventBus.emit("cutscene:stop", {
                sceneName: eventData.name,
              });
            }
          );
        } else {
          console.error("Scene camera not found for cutscene: ", sceneName);
        }

        console.log("sceneCamera: ", sceneCamera);
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
    };
  stopCutsceneHandler =
    (animGroup: AnimationGroup) =>
    ({
      sceneName,
      args = {},
    }: {
      sceneName: string;
      args?: Record<string, any>;
    }) => {
      if (animGroup.name !== sceneName) {
        console.warn(
          "cutscene animation group name does not match the requested scene name for stop!"
        );
        return;
      }
      // this method is called through bus. we need to bind to it all necessary data and
      // process playing cutscene
      // if (animGroup.isStarted) {
      console.log("stopping cutscene: ", animGroup.name);
      animGroup.stop();
      animGroup.reset();
      // this._sceneController.game._camera.setGroundMesh(this.meshDict.ground.mesh);
      // this._sceneController.game._camera.camera.setTarget(this.meshDict.ground.mesh.position);
      this._scene.activeCamera = this._scene.getCameraById("camera");
      this._sceneController.scene.activeCamera =
        this._scene.getCameraById("camera");
      // } else {
      // console.warn(
      //   "cutscene animation group is not started, cannot stop it: ",
      //   animGroup.name
      // );
      // }
    };

  private loadLevel = (levelName: string /* xNyN*/) => {
    console.log("loadLevel: ", levelName);
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

      assetsManager.onFinish = (tasks) => {
        console.log("tasks: ", tasks);
        this.loadedChunks.push(levelName);
        const meshTask = findBy(tasks, "name", "meshTask") as MeshAssetTask;
        console.log("meshTask: ", meshTask);
        meshTask.loadedAnimationGroups.forEach((animGroup) => {
          console.log("animGroup: ", animGroup);
          animGroup.stop(true);
          GlobalEventBus.on(
            "cutscene:trigger",
            this.playCutsceneHandler(animGroup)
          );
          GlobalEventBus.on(
            "cutscene:stop",
            this.stopCutsceneHandler(animGroup)
          );
        });

        this.meshProcessor.processMeshes(
          levelName,
          meshTask.loadedMeshes
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
          message: `Error loading task: ${task.name}`,
        });
      };
      assetsManager.load();
    };
    const loader = new ResourceLoaderController();
    loader.getResource(levelName, onSuccess);
  };
}
