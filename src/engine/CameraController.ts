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

        this._camera = new ArcRotateCamera('camera', 1, 0, 10, new Vector3(0, 1, -5), scene);
        this._camera.maxZ =100
        this._camera.lowerRadiusLimit = 3
        this._camera.upperRadiusLimit = 20
        // This targets the camera to scene origin
        // this._camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        this._camera.attachControl(canvas, true);


        // this._camera
    }
    get camera() {
        return this._camera;
    }

}