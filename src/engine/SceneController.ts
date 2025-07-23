import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { PlayerController } from './PlayerController';

export class SceneController {
  private _scene: Scene;
  private _playerController: PlayerController;
  constructor(engine: Engine) {
      this._scene = new Scene(engine);
      this.createLight(this._scene)
      this._playerController = new PlayerController()
    //   this.testScene(this._scene)
  }
  get scene() {
    return this._scene;
  }
  setPlayerPos(pos: Vector3){
    this._playerController.setInitialPosition(pos)
  }

  private createLight(scene: Scene) {
    return new HemisphericLight("light", new Vector3(1, 1, 0), scene);
  }
  public testScene(camera:ArcRotateCamera): void {

    camera.setTarget(this._playerController.mesh)
  }
  public createGroundScene() {

  }
}
