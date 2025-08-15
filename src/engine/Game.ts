import { Engine, HavokPlugin, KeyboardInfo, Observable, Scene, WebGPUEngine } from '@babylonjs/core';

import { CameraController } from './CameraController';
import { DialogController } from './DialogController';
import { SceneController } from './SceneController';
import { SoundController } from './SoundController';
import { FreeCameraTouchVirtualJoystickInput } from './VirtualJoystick';
import { MapController } from './levelLoader/MapController';

export class Game {
  private _canvas;
  _sceneController?: SceneController;
   _camera?: CameraController;
  private _engine;
  private _debug: boolean;
  private _scene?: Scene;
  soundController?: SoundController;
  private _mapController?: MapController;
  dialogController?: DialogController
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
    debug = false,
    setLoadInfo: React.Dispatch<React.SetStateAction<{ current: number; total: number; message: string; }>>
  ) {
    this._debug = debug;
    this._canvas = canvas;
    // this.resourceLoaderController = new ResourceLoaderController()

    // Create our engine to hold on the canvas
    // this._engine = new Engine(canvas, true, {
    //   preserveDrawingBuffer: false,
    //   alpha: false,
    // });
    this._engine = new WebGPUEngine(canvas, {
      adaptToDeviceRatio: true,
      enableAllFeatures: true,
      audioEngine: true,
      antialias: true,

      // preserveDrawingBuffer: false,
      // alpha: false,
    });
    this._engine.initAsync().then(() => {
    this.soundController = new SoundController();
    this._engine.preventCacheWipeBetweenFrames = true;
    this._sceneController = new SceneController(
      this._engine,
      hk,
      this.soundController,
      canvas,
      this
    );
    this.dialogController = new DialogController(this)
    this._scene = this._sceneController.scene;
    this._camera = new CameraController(this._canvas, this._scene);

    if (this.isTouchDevice()) {
      this._camera.camera.inputs.clear()
      this._camera.camera.inputs.add(new FreeCameraTouchVirtualJoystickInput(this._camera.camera))
      this._camera.camera.attachControl(canvas, true);
    }


    this._sceneController.testScene(this._camera.camera);
    this._mapController = new MapController({
      scene: this._scene,
      sceneController: this._sceneController,
      setLoadInfo
    });
    this._sceneController.setMapController(this._mapController);
    this._sceneController.createInput();
    const cnvs = document.getElementById('canvas') as HTMLElement
    const ro = new ResizeObserver((entries) => {
      this._engine.resize()
    })
    ro.observe(cnvs)
    this._engine.runRenderLoop(() => {
      if (!this._scene) return;
      this._scene.render();
    });
    this.asyncInit();
    });
  }

  async asyncInit() {
    if (!this._sceneController) {
      throw new Error("SceneController is not initialized");
    }

    if (!this.dialogController) {
      throw new Error("DialogController is not initialized");
    }
    if(!this.soundController) {
      throw new Error("SoundController is not initialized");
    }
    // const storyRes = await fetch('/public/npc1.json')
    await this.dialogController.loadDialog('npc2_shop', () =>fetch('npc1.json').then(res => res.json()))
    this.dialogController.bindEventToDialog('pressT', "npc2_shop", "npc2_shop")

    await this._sceneController.asyncInit();
    await this.soundController.asyncInit();
    this.soundController.playTheme();
  }
  public async toggleDebugLayer(): Promise<void> {
    if(!this._scene) return;
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
    if (!this._scene) {
      throw new Error("Scene is not initialized");
    }
    return this._scene.onKeyboardObservable;
  }
}
