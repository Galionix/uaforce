import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";

export class SceneController {
  private _scene: Scene;
  constructor(engine: Engine) {
      this._scene = new Scene(engine);
      this.createLight(this._scene)
    //   this.testScene(this._scene)
  }
  get scene() {
    return this._scene;
  }

  private createLight(scene: Scene) {
    return new HemisphericLight("light", new Vector3(1, 1, 0), scene);
  }
  public testScene(camera:ArcRotateCamera): void {
    const box = MeshBuilder.CreateBox("box", { size: 2 });
    box.position.y = -2;
    camera.setTarget(box)
  }
  public createGroundScene() {

  }
}
