import { ArcRotateCamera, Mesh, Ray, Scene, Vector3 } from '@babylonjs/core';

export class CameraController {

    private _scene:Scene;
    private _camera: ArcRotateCamera;
    groundMesh?:Mesh

    public setGroundMesh(ground: Mesh){
        this.groundMesh = ground
        this._scene.registerBeforeRender(()=>{

            const ray = new Ray(this.camera.position, Vector3.Down(), 1).intersectsMesh(ground)

            if (ray.hit) {
              this.camera.setPosition(new Vector3(this.camera.position.x, ray.pickedPoint!.y + 1, this.camera.position.z))
            }
        })
    }
    constructor(canvas: HTMLCanvasElement, scene: Scene) {
        this._scene = scene;

        this._camera = new ArcRotateCamera('camera', Math.PI /2, Math.PI /2, 10, new Vector3(0, 1, -5), scene);
        this._camera.maxZ =100
        this._camera.lowerRadiusLimit = 20
        this._camera.upperRadiusLimit = 20
    }
    get camera() {
        return this._camera;
    }

}