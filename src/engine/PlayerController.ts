import {
    HavokPlugin, Mesh, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsRaycastResult,
    PhysicsShapeType, Scene, Vector3
} from '@babylonjs/core';

import { SoundController } from './SoundController';

export class PlayerController {
    // position: Vector3;
    playerMesh: Mesh;
    propsFromBlender: any
    scene: Scene
    _aggregate?: PhysicsAggregate;
    hk: HavokPlugin
    soundController: SoundController

    _groundColliderMesh?: Mesh
    footRaycast = new PhysicsRaycastResult();
    constructor(scene: Scene, hk: HavokPlugin, soundController: SoundController) {
        this.playerMesh = this.drawPlayerModel()
        this.soundController = soundController
        this.scene = scene
        this.hk = hk
    }

    get aggregate() {
        if(!this._aggregate) console.error("this shouldnt happen but actual aggregate undefined")
        return this._aggregate || new PhysicsAggregate(this.playerMesh, PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0.75 }, this.scene);
    }

    private setup2DConstraints() {
        if (!this._aggregate) return;

        // Set linear damping on Z-axis to prevent unwanted Z movement
        // Note: This is a manual approach since Havok doesn't have direct axis constraints
        this.scene.onBeforeRenderObservable.add(() => {
            if (this._aggregate) {
                const velocity = this._aggregate.body.getLinearVelocity();
                // Force Z velocity to always be 0
                if (velocity.z !== 0) {
                    this._aggregate.body.setLinearVelocity(new Vector3(velocity.x, velocity.y, 0));
                }

                // Force Z position to stay at 0 (or whatever your 2D plane is)
                const position = this.playerMesh.position;
                if (position.z !== 0) {
                    this.playerMesh.position.z = 0;
                }

                // Force rotation to always be zero (prevent any clockwise/counterclockwise drift)
                if (!this.playerMesh.rotation.equals(Vector3.Zero())) {
                    this.playerMesh.rotation = Vector3.Zero();
                }
            }
        });
    }
    setInitialPosition(position: Vector3, props: any) {

        this.propsFromBlender = props
        const playerAggregate = new PhysicsAggregate(this.playerMesh, PhysicsShapeType.CAPSULE, {
            friction: 1,
            mass: 10, restitution: 0.1, center: new Vector3(0, -2, 0)
        }, this.scene);
        this.playerMesh.checkCollisions = true;
        this._aggregate = playerAggregate
        this._aggregate.body.disablePreStep = false;
        this.aggregate.body.setMassProperties({
            mass: 10,
            inertia: new Vector3(1000, 1000, 1000), // High inertia to resist rotation
            centerOfMass: new Vector3(0, -1, 0),
        })
        this._aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.hk.setAngularDamping( this._aggregate.body,Number.MAX_SAFE_INTEGER);

        // Lock physics to 2D - prevent movement on Z-axis and rotation on X/Y axes
        this.setup2DConstraints();

        // Explicitly set initial rotation to zero
        this.playerMesh.rotation = Vector3.Zero();
        console.log('playerAggregate: ', playerAggregate);
        console.log('this.propsFromBlender: ', this.propsFromBlender);
        // this._aggregate.body.applyImpulse(new Vector3(0, 0, 20), this.playerMesh.getAbsolutePosition());
        // this.scene.onKeyboardObservable.add((kbInfo) => {
        //     switch (kbInfo.type) {
        //         case KeyboardEventTypes.KEYDOWN:
        //             switch (kbInfo.event.key) {
        //                 case "a":
        //                 case "A":
        //                     this.playerMesh.position.x -= 0.1;
        //                 break
        //                 case "d":
        //                 case "D":
        //                     this.playerMesh.position.x += 0.1;
        //                 break
        //                 case "w":
        //                 case "W":
        //                     this.playerMesh.position.y += 0.1;
        //                 break
        //                 case "s":
        //                 case "S":
        //                     this.playerMesh.position.y -= 0.1;
        //                 break
        //             }
        //         break;
        //     }
        // });
    }
    // bindBodyShape = function (mesh, shape, mass, centerOfMass, scene) {
    //     mesh.material = new StandardMaterial("material");
    //     mesh.material.diffuseColor = new Color3(0, 0, 1);
    //     mesh.material.alpha = 0.8;

    //     const body = new PhysicsBody(
    //         mesh,
    //         PhysicsMotionType.DYNAMIC,
    //         false,
    //         scene
    //     );

    //     const centerOfMassIndicator = MeshBuilder.CreateSphere(
    //         "centerOfMassIndicator",
    //         { diameter: 0.2 }
    //     );
    //     centerOfMassIndicator.position = centerOfMass;
    //     centerOfMassIndicator.parent = mesh;
    //     centerOfMassIndicator.material = new StandardMaterial(
    //         "centerOfMassMaterial"
    //     );
    //     // centerOfMassIndicator.material = new Color3(1, 0, 0);

    //     shape.material = { friction: 0.2, restitution: 0.3 };
    //     body.shape = shape;
    //     body.setMassProperties({ centerOfMass, mass });
    // };
    drawPlayerModel() {
        const player = MeshBuilder.CreateCapsule("box");
        const groundCollider = MeshBuilder.CreateBox("ground detect")
        const nose = MeshBuilder.CreateBox("nose", {
            width: 0.5,
            size: 0.2,
        })
        nose.position = new Vector3(0, 0.5, 1)
        nose.rotation = new Vector3(0, Math.PI / 2, 0)
        nose.parent = player
        groundCollider.position.y = -0.5;
        groundCollider.parent = player
        groundCollider.showBoundingBox = true;
        groundCollider.isVisible = false
        this._groundColliderMesh = groundCollider
        player.position.y = 10
        player.showBoundingBox = true;
        return player
    }

    get mesh() {
        return this.playerMesh
    }

    get groundColliderMesh() {
        return this._groundColliderMesh;
    }

}