import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { PlayerController } from './PlayerController';
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core";

export class SceneController {
  private _scene: Scene;
  private _playerController: PlayerController;
  constructor(engine: Engine, hk: HavokPlugin) {
    this._scene = new Scene(engine);
          this._scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

    // this.createLight(this._scene)

    // todo: this comes after physics
      this._playerController = new PlayerController(this._scene)
    //   this.testScene(this._scene)
  }
  get scene() {
    return this._scene;
  }
  async addPhysicsAsync() {
    const havokInstance = await HavokPhysics();
    const hk = new HavokPlugin(true, havokInstance);

    // @ts-ignore
    globalThis.HK = havokInstance;
    this._scene.enablePhysics(undefined, hk);
  }
  setPlayerPos(pos: Vector3, props: any){
    this._playerController.setInitialPosition(pos, props)
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
