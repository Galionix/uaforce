import {
    FreeCamera, DirectionalLight, Engine, HavokPlugin, Scene, Vector3,
    WebGPUEngine
} from '@babylonjs/core';

import { Game } from './Game';
import { GuiController } from './GuiController';
import { createInputController } from './InputController';
import { MapController } from './levelLoader/MapController';
import { PlayerController } from './PlayerController';
import { SoundController } from './SoundController';
import { CameraController } from './CameraController';
import { ProjectileGameIntegration } from './projectiles';

export class SceneController {
  private _scene: Scene;
  _engine: WebGPUEngine;
  private _playerController: PlayerController;
  private _mapController?: MapController;
  private _cameraController?: CameraController;
   guiController?: GuiController;
  physEngine;
  soundController: SoundController;
  projectileSystem?: ProjectileGameIntegration;

  // raycastInfo
  setCameraController(cameraController: CameraController) {
    this._cameraController = cameraController;
  }
  get cameraController() {
    if(!this._cameraController) {
      console.error("CameraController is not set in SceneController");
      throw new Error("CameraController is not set in SceneController");
    }
    return this._cameraController;
  }
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
  game:Game
  constructor(engine: WebGPUEngine, hk: HavokPlugin, soundController: SoundController, canvas: HTMLCanvasElement, gameController: Game) {
    this._scene = new Scene(engine);
    this.soundController = soundController
    this._scene.collisionsEnabled = true;
    this._scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
    this._engine = engine;
    this.physEngine = hk;
    this.guiController = new GuiController(this)
    this.canvas = canvas
    this.game = gameController
    // todo: this comes after physics
    this._playerController = new PlayerController(this._scene, hk, this.soundController);
    // this.createInput();
  }
  get scene() {
    return this._scene;
  }

  async asyncInit()  {
    await this.guiController?.loadGui()
    this.createLight(this._scene)

    // Initialize projectile system from game controller
    if (this.game.projectileSystem) {
      this.projectileSystem = this.game.projectileSystem;
    }
  }
  setPlayerPos(pos: Vector3, props: any) {
    this._playerController.setInitialPosition(pos, props);
  }
  createInputController = createInputController;
  createInput() {
    createInputController(this);
  }

  private createLight(scene: Scene) {
    const light = new DirectionalLight("DirectionalLight", Vector3.Down(), scene);
    light.position = new Vector3(0,1000,10)
    // light.
    // return new HemisphericLight("light", new Vector3(1, 1, 0), scene);
    return light
  }
  public testScene(camera: FreeCamera): void {
    // Camera will now follow player automatically via CameraController
    // Initial target setup can be done here if needed
    camera.setTarget(this._playerController.mesh.position);
  }
  public createGroundScene() {}
}
