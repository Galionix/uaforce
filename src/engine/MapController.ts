import {
  AbstractAssetTask,
  AbstractMesh,
  AssetsManager,
  MeshAssetTask,
  Observable,
  Scene,
  TransformNode,
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
  processMeshes(meshes: AbstractMesh[]) {
    console.log("meshes: ", meshes);
  }
  processTransformNodes(tnodes: TransformNode[]) {
      console.log("tnodes: ", tnodes);
      tnodes.forEach((tnode) => {
          if (tnode.id.includes("PLAYER_SPAWN")) {
              console.log('tnode: ', tnode);
              this._sceneController.setPlayerPos(tnode.position.clone())
          }
      })
  }
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
      const task = tasks[0] as MeshAssetTask;
      this.processMeshes(task.loadedMeshes);
      this.processTransformNodes(task.loadedTransformNodes);
      this.disableGlobalLoading();
      this._sceneController;
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
