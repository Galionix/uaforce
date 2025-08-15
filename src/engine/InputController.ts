import {
  ActionEvent,
  ActionManager,
  ExecuteCodeAction,
  KeyboardEventTypes,
  MeshBuilder,
  PickingInfo,
  Ray,
  RayHelper,
  Vector3,
} from "@babylonjs/core";

import { GlobalEventBus } from "./event-bus";
import { SceneController } from "./SceneController";
import { PlayerMovementController } from "./PlayerMovementController";

const gravity = new Vector3(0, -0.2, 0);

export const createInputController = (sc: SceneController) => {
  console.log("createInputController");
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
  var hitInfo: Array<PickingInfo>;

  // Create the movement controller
  const movementController = new PlayerMovementController(sc);

  sc.scene.registerBeforeRender(function () {
    // Get all meshes that have collideable = true in their gltf.extras
    const collideableMeshes = sc.scene.meshes.filter(mesh => {
      return mesh.metadata?.gltf?.extras?.collideable === true;
    });

    if (collideableMeshes.length === 0) return;

    hitInfo = ray.intersectsMeshes(collideableMeshes);

    if (hitInfo.length && hitInfo[0].pickedPoint) {
      sphere.setEnabled(true);
      sphere.position.copyFrom(hitInfo[0].pickedPoint);
      onGround = true;
    } else {
      sphere.setEnabled(false);
      onGround = false;
    }
    console.log('onGround: ', onGround);
  });

  sc.scene.actionManager = new ActionManager(sc.scene);
  sc.scene.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, function (evt) {
      inputMap[evt.sourceEvent.code] =
        evt.sourceEvent.type == "keydown" ? evt : false;
    })
  );

  sc.scene.onKeyboardObservable.add((kbInfo) => {
    switch (kbInfo.type) {
      case KeyboardEventTypes.KEYDOWN:
        if (kbInfo.event.code === "Escape") {
          // sc.soundController.SoundsAudios.sfx.ui.click.play();

          sc.guiController?.toggleMainMenu();
          // console.log("Space was pressed once!");
        }
        if (kbInfo.event.code === "KeyT") {
          GlobalEventBus.emit("dialog:trigger", {
            eventId: "pressT",
          });
          // sc.soundController.SoundsAudios.sfx.ui.click.play();

          // sc.guiController?.toggleMainMenu();
          // console.log("Space was pressed once!");
        }
        if (kbInfo.event.code === "KeyC") {
          GlobalEventBus.emit("cutscene:trigger", {
            sceneName: "Intro scene 1",
          });
          // sc.soundController.SoundsAudios.sfx.ui.click.play();

          // sc.guiController?.toggleMainMenu();
          // console.log("Space was pressed once!");
        }
        if (kbInfo.event.code === "KeyX") {
          GlobalEventBus.emit("cutscene:stop", {
            sceneName: "Intro scene 1",
          });
          // sc.soundController.SoundsAudios.sfx.ui.click.play();

          // sc.guiController?.toggleMainMenu();
          // console.log("Space was pressed once!");
        }
        break;
        // case BABYLON.KeyboardEventTypes.KEYUP:
        //   // Можно отлавливать отпускание
        break;
    }
  });

  sc.scene.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, function (evt) {
      inputMap[evt.sourceEvent.code] =
        evt.sourceEvent.type == "keydown" ? evt : false;
    })
  );
  let keydown = false;

  sc.scene.onBeforeRenderObservable.add(() => {
    // Gather input state
    const movementInput = {
      moveLeft: !!inputMap["KeyA"],
      moveRight: !!inputMap["KeyD"],
      jump: !!inputMap["Space"],
      sprint: !!inputMap.ShiftLeft
    };

    // Update movement using the movement controller
    movementController.update(movementInput, onGround);

    // Update keydown state for other systems that might need it
    keydown = movementInput.moveLeft || movementInput.moveRight;
  });
};
