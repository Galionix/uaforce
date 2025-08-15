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

                // Force rotation to stay controlled (prevent physics drift but allow intentional Y rotation)
                // Only reset X and Z rotation, allow Y rotation for direction facing
                if (this.playerMesh.rotation.x !== 0 || this.playerMesh.rotation.z !== 0) {
                    this.playerMesh.rotation.x = 0;
                    this.playerMesh.rotation.z = 0;
                    // Keep Y rotation as is for direction facing
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

        // Set initial facing direction - start with no rotation to debug
        this.playerMesh.rotation = new Vector3(0, 0, 0); // No rotation initially

    }

    drawPlayerModel() {
        const player = MeshBuilder.CreateCapsule("box");
        const groundCollider = MeshBuilder.CreateBox("ground detect")
        const nose = MeshBuilder.CreateBox("nose", {
            width: 0.5,
            size: 0.2,
        })
        // Position nose clearly to one side for testing
        nose.position = new Vector3(-1, 0.5, 0) // Flip to the opposite side
        nose.parent = player
        groundCollider.position.y = -0.5;
        groundCollider.parent = player
        groundCollider.showBoundingBox = true;
        groundCollider.isVisible = false
        this._groundColliderMesh = groundCollider
        player.position.y = 10
        player.showBoundingBox = true;

        // Start with no rotation to see which side the nose is on
        player.rotation.y = 0; // No rotation initially to debug

        return player
    }

    get mesh() {
        return this.playerMesh
    }

    get groundColliderMesh() {
        return this._groundColliderMesh;
    }

}