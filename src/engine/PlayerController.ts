import { Mesh, MeshBuilder, Vector3 } from '@babylonjs/core';

export class PlayerController {
    // position: Vector3;
    playerMesh: Mesh;
    propsFromBlender: any
    constructor() {
        this.playerMesh = this.drawPlayerModel()
    }

    setInitialPosition(position: Vector3, props: any) {
        this.playerMesh.position = position

        this.propsFromBlender = props
        console.log('this.propsFromBlender: ', this.propsFromBlender);
    }

    drawPlayerModel() {
        return MeshBuilder.CreateBox("box", { size: 2 });
    }

    get mesh() {
        return this.playerMesh
    }

}