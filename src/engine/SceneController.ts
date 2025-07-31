import {
    ArcRotateCamera, Engine, HavokPlugin, HemisphericLight, Scene, Vector3
} from '@babylonjs/core';

import { GuiController } from './GuiController';
import { createInputController } from './InputController';
import { MapController } from './MapController';
import { PlayerController } from './PlayerController';
import { SoundController } from './SoundController';

export class SceneController {
  private _scene: Scene;
  _engine: Engine;
  private _playerController: PlayerController;
  private _mapController?: MapController;
   guiController?: GuiController;
  physEngine;
  soundController: SoundController

  // raycastInfo
  setMapController(mapController: MapController) {
    this._mapController = mapController;
  }
  get mapController() {
    return this._mapController;
  }
  get playerController() {
    return this._playerController;
  }
  canvas: HTMLCanvasElement
  constructor(engine: Engine, hk: HavokPlugin, soundController: SoundController, canvas: HTMLCanvasElement) {
    this._scene = new Scene(engine);
    this.soundController = soundController
    this._scene.collisionsEnabled = true;
    this._scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
    this._engine = engine;
    this.physEngine = hk;
    this.guiController = new GuiController(this)
    this.canvas = canvas
    // todo: this comes after physics
    this._playerController = new PlayerController(this._scene, hk, this.soundController);
    // this.createInput();
  }
  get scene() {
    return this._scene;
  }

  async asyncInit()  {
    await this.guiController?.loadGui()

  }
  setPlayerPos(pos: Vector3, props: any) {
    this._playerController.setInitialPosition(pos, props);
  }
  createInputController = createInputController;
  createInput() {
    createInputController(this);
  }

  private createLight(scene: Scene) {
    return new HemisphericLight("light", new Vector3(1, 1, 0), scene);
  }
  public testScene(camera: ArcRotateCamera): void {
    camera.setTarget(this._playerController.mesh);
  }
  public createGroundScene() {}
}
