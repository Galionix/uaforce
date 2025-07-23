import {
  AbstractAssetTask,
  AssetsManager,
  Observable,
  Scene,
} from "@babylonjs/core";
import { initialChunkPos, mapData } from "@ex/constants/chunksData";
import { useStore } from "@ex/zustand/store";
import { SceneController } from "./SceneController";

export class MapController {
  chunksData = mapData;
  currentChunk = initialChunkPos;
  globalLoading = true;
  loaded = false;
  _scene: Scene;
  _sceneController: SceneController;
  constructor({
    scene,
    sceneController,
  }: {
    scene: Scene;
    sceneController: SceneController;
  }) {
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
  enableGlobalLoading = () => {};
  private loadChunk = (position: string /* xNyN*/) => {
    const assetsManager = new AssetsManager(this._scene);

    //   assetsManager.onProgressObservable = () => {

    // }
    const chunkData = this.chunksData[position];
    const meshTask = assetsManager.addMeshTask(
      "skull task",
      "",
      "models/",
      `${chunkData.chunkName}.glb`
    );
    const onSuccess = (tasks: AbstractAssetTask[]) => {
      console.log("tasks: ", tasks);

        this.disableGlobalLoading();
        this._sceneController
    };
    // assetsManager.onProgress = (
    //   remainingCount: number,
    //   totalCount: number,
    //   task: AbstractAssetTask
    // ) => {
    //   console.log({
    //     remainingCount,
    //     totalCount,
    //     task,
    //   });
    // };
    assetsManager.useDefaultLoadingScreen = false;
    assetsManager.onFinish = onSuccess;
    assetsManager.load();

    // meshTask.run(
    //   this._scene,
    //   onSuccess,
    //   (message?: string, exception?: any) => {
    //     console.log("mesh task errored");
    //     console.error(message, exception);
    //   }
    // );
  };
}
