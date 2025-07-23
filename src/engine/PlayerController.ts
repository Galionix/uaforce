import { Mesh, MeshBuilder, Vector3 } from '@babylonjs/core';

export class PlayerController {
    // position: Vector3;
    playerMesh: Mesh;
    constructor() {
        this.playerMesh = this.drawPlayerModel()
    }

    setInitialPosition(position: Vector3) {
        this.playerMesh.position = position
    }

    drawPlayerModel() {
        return MeshBuilder.CreateBox("box", { size: 2 });
    }

    get mesh() {
        return this.playerMesh
    }

}