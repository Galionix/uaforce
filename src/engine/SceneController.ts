import {
  ActionEvent,
  ActionManager,
  ArcRotateCamera,
  Engine,
  EventState,
  ExecuteCodeAction,
  HemisphericLight,
  MeshBuilder,
  Ray,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { PlayerController } from "./PlayerController";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core";
import { MapController } from './MapController';
import { createInputController } from './InputController';

export class SceneController {
  private _scene: Scene;
  private _engine: Engine;
  private _playerController: PlayerController;
  private _mapController?: MapController;
  physEngine;
  // raycastInfo
  setMapController(mapController: MapController) {
    this._mapController = mapController
  }
  get mapController() {
    return this._mapController
  }
  get playerController() {
    return this._playerController
  }
  constructor(engine: Engine, hk: HavokPlugin) {
    this._scene = new Scene(engine);
    this._scene.collisionsEnabled = true;
    this._scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
    this._engine = engine;
    this.physEngine = hk;

    // todo: this comes after physics
    this._playerController = new PlayerController(this._scene, hk);
    // this.createInput();
  }
  get scene() {
    return this._scene;
  }

  setPlayerPos(pos: Vector3, props: any) {
    this._playerController.setInitialPosition(pos, props);
  }
  createInputController = createInputController
  createInput() {
    createInputController(this)
  }

  private createLight(scene: Scene) {
    return new HemisphericLight("light", new Vector3(1, 1, 0), scene);
  }
  public testScene(camera: ArcRotateCamera): void {
    camera.setTarget(this._playerController.mesh);
  }
  public createGroundScene() {}
}
