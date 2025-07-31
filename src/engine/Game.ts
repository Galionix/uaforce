import { Engine, HavokPlugin, KeyboardInfo, Observable, Scene } from '@babylonjs/core';

import { CameraController } from './CameraController';
import { MapController } from './MapController';
import { SceneController } from './SceneController';
import { SoundController } from './SoundController';
import { FreeCameraTouchVirtualJoystickInput } from './VirtualJoystick';

export class Game {
  private _canvas;
  private _sceneController: SceneController;
  private _camera: CameraController;
  private _engine;
  private _debug: boolean;
  private _scene: Scene;
  soundController: SoundController;
  private _mapController: MapController;
  isTouchDevice() {
    const res = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    // alert(res)
    return res;
  }
  // public resourceLoaderController: ResourceLoaderController
  constructor(
    canvas: HTMLCanvasElement,
    hk: HavokPlugin,
    // particleTextureURL: string,
    debug = false
  ) {
    this._debug = debug;
    this._canvas = canvas;
    // this.resourceLoaderController = new ResourceLoaderController()

    // Create our engine to hold on the canvas
    this._engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      alpha: false,
    });
    this.soundController = new SoundController();
    this._engine.preventCacheWipeBetweenFrames = true;
    this._sceneController = new SceneController(
      this._engine,
      hk,
      this.soundController,
      canvas
    );
    this._scene = this._sceneController.scene;
    this._camera = new CameraController(this._canvas, this._scene);

    if (this.isTouchDevice() || true) {
      this._camera.camera.inputs.clear()
      this._camera.camera.inputs.add(new FreeCameraTouchVirtualJoystickInput(this._camera.camera))
      this._camera.camera.attachControl(canvas, true);
    }


    this._sceneController.testScene(this._camera.camera);
    this._mapController = new MapController({
      scene: this._scene,
      sceneController: this._sceneController,
    });
    this._sceneController.setMapController(this._mapController);
    this._sceneController.createInput();
    const cnvs = document.getElementById('canvas') as HTMLElement
    const ro = new ResizeObserver((entries) => {
      this._engine.resize()
    })
    ro.observe(cnvs)
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }

  async asyncInit() {

    await this._sceneController.asyncInit();
    await this.soundController.asyncInit();
    this.soundController.playTheme();
  }
  public async toggleDebugLayer(): Promise<void> {
    // Rely on code splitting to prevent all of babylon
    // + loaders, serializers... to be downloaded if not necessary
    const debugModule = await import(
      /* webpackChunkName: "debug" */ "./debug/appDebug"
    );
    debugModule.toggleDebugMode(this._scene);
    // const viewer = new PhysicsViewer(this._scene);
    // for (let mesh of this._scene.meshes) {
    //   console.log("toggleDebugMode for mesh: ", mesh);
    //   if (mesh.physicsBody) {
    //     viewer.showBody(mesh.physicsBody);
    //   }
    // }
  }

  public get onKeyboardObservable(): Observable<KeyboardInfo> {
    return this._scene.onKeyboardObservable;
  }
}
