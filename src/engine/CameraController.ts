import { ArcRotateCamera, Camera, FreeCamera, Scene, Vector3 } from '@babylonjs/core';

export class CameraController {

    private _scene:Scene;
    private _camera: ArcRotateCamera;

    constructor(canvas: HTMLCanvasElement, scene: Scene) {
        this._scene = scene;

        this._camera = new ArcRotateCamera('camera', 1, 0, 10, new Vector3(0, 1, -5), scene);

        // This targets the camera to scene origin
        // this._camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        this._camera.attachControl(canvas, true);
    }
    get camera() {
        return this._camera;
    }

}