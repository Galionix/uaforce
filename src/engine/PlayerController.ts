import { Mesh, MeshBuilder, PhysicsAggregate, PhysicsImpostor, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { SceneController } from './SceneController';

export class PlayerController {
    // position: Vector3;
    playerMesh: Mesh;
    propsFromBlender: any
    scene: Scene
    constructor(scene: Scene) {
        this.playerMesh = this.drawPlayerModel()
        this.scene = scene
    }

    setInitialPosition(position: Vector3, props: any) {
        this.playerMesh.position = position

        this.propsFromBlender = props
        console.log('this.propsFromBlender: ', this.propsFromBlender);
    }

    drawPlayerModel() {
        const player = MeshBuilder.CreateBox("box", { size: 2 });
        const playerAggregate = new PhysicsAggregate(player, PhysicsShapeType.BOX, { mass: 1, restitution:0.75}, this.scene);
        console.log('playerAggregate: ', playerAggregate);

        return player
    }

    get mesh() {
        return this.playerMesh
    }

}