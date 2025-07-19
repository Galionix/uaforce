import { Engine, KeyboardInfo, Observable, Scene } from "@babylonjs/core";
import { SceneController } from "./SceneController";
import { CameraController } from "./CameraController";

export class Game {
  private _canvas;
  private _sceneController: SceneController;
  private _camera: CameraController;
  private _engine;
  private _debug: boolean;
  private _scene: Scene;

  constructor(
    canvas: HTMLCanvasElement,
    // particleTextureURL: string,
    debug = false
  ) {
    this._debug = debug;
    this._canvas = canvas;

    // Create our engine to hold on the canvas
    this._engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      alpha: false,
    });
    this._engine.preventCacheWipeBetweenFrames = true;
    this._sceneController = new SceneController(this._engine);
    this._scene = this._sceneController.scene;
    this._camera = new CameraController(this._canvas, this._scene);
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }
  public async toggleDebugLayer(): Promise<void> {
    // Rely on code splitting to prevent all of babylon
    // + loaders, serializers... to be downloaded if not necessary
    const debugModule = await import(
      /* webpackChunkName: "debug" */ "./debug/appDebug"
    );
    debugModule.toggleDebugMode(this._scene);
  }

  public get onKeyboardObservable(): Observable<KeyboardInfo> {
    return this._scene.onKeyboardObservable;
  }
}


