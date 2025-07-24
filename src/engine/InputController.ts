import {
  ActionEvent,
  ActionManager,
  ExecuteCodeAction,
  MeshBuilder,
  Ray,
  RayHelper,
  Vector3,
} from "@babylonjs/core";
import { SceneController } from "./SceneController";
const gravity = new Vector3(0, -0.2, 0);

export const createInputController = (sc: SceneController) => {
  const velocity = new Vector3();
  let isJumping = false;
  var localMeshDirection = new Vector3(0, -1, 0);
  var localMeshOrigin = new Vector3(0, 0, 0.4);
  var ray = new Ray(localMeshOrigin, localMeshDirection);
  var rayHelper = new RayHelper(ray);
  var length = 0.7;
  var sphere = MeshBuilder.CreateSphere("", { diameter: 0.15 }, sc.scene);
  sphere.setEnabled(false);
  let onGround = false;
  rayHelper.attachToMesh(
    sc.playerController.mesh,
    localMeshDirection,
    localMeshOrigin,
    length
  );
  rayHelper.show(sc.scene);
  var inputMap: Record<ActionEvent["sourceEvent"]["key"], ActionEvent | false> =
    {};

  sc.scene.registerBeforeRender(function () {
    // box.rotation.y += .01;
    if (!sc.mapController?.meshDict.ground.mesh) return;
    var hitInfo = ray.intersectsMeshes([
      sc.mapController?.meshDict.ground.mesh,
    ]);

    if (hitInfo.length && hitInfo[0].pickedPoint) {
      sphere.setEnabled(true);
      sphere.position.copyFrom(hitInfo[0].pickedPoint);
      onGround = true;
    } else {
      sphere.setEnabled(false);
      onGround = false;
    }
  });

  sc.scene.actionManager = new ActionManager(sc.scene);
  sc.scene.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, function (evt) {
      inputMap[evt.sourceEvent.code] =
        evt.sourceEvent.type == "keydown" ? evt : false;
    })
  );

  sc.scene.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, function (evt) {
      inputMap[evt.sourceEvent.code] =
        evt.sourceEvent.type == "keydown" ? evt : false;
    })
  );
  sc.scene.registerBeforeRender(() => {
    const delta = sc.scene.getEngine().getDeltaTime();

    velocity.y -= delta / 300;
    if (onGround) {
      velocity.y = Math.max(0, velocity.y);
      isJumping = false;
    }
    if (inputMap["Space"] && onGround) {
      isJumping = true;

      velocity.y = 100;
      sc.playerController.aggregate.body.applyImpulse(
        velocity,

        sc.playerController.mesh.getAbsolutePosition()
      );
    }
  });

  let keydown = false;
  sc.scene.onBeforeRenderObservable.add(() => {
    const heroSpeed = 3;
    let speedMult = 1;
    const heroSpeedBackwards = 1;
    const heroRotationSpeed = 0.1;
    if (
      !sc.mapController?.meshDict.ground.mesh ||
      !sc.playerController.groundColliderMesh
    )
      return;

    // @ts-ignore
    if (inputMap.ShiftLeft) {
      speedMult = 2;
    }
    if (onGround && inputMap["KeyW"]) {
      const vec = sc.playerController.mesh.forward
        .scale(heroSpeed * speedMult)
        .add(gravity);
      // this makes it jump!
      if (isJumping) vec.addInPlace(new Vector3(0, 10, 0));
      sc.playerController.aggregate.body.setLinearVelocity(vec);
      keydown = true;
    } else if (onGround && inputMap["KeyS"]) {
      const vec = sc.playerController.mesh.forward
        .scale(-heroSpeedBackwards)
        .add(gravity);
      sc.playerController.aggregate.body.setLinearVelocity(vec);
      keydown = true;
    } else {
    }
    if (inputMap["KeyA"]) {
      sc.playerController.mesh.rotate(Vector3.Up(), -heroRotationSpeed);
      keydown = true;
    }
    if (inputMap["KeyD"]) {
      sc.playerController.mesh.rotate(Vector3.Up(), heroRotationSpeed);
      keydown = true;
    }
  });
};
