import { ActionEvent, ActionManager, ExecuteCodeAction, Vector3 } from '@babylonjs/core';
import { SceneController } from './SceneController';
const gravity = new Vector3(0, -0.2, 0);

export const createInputController = (sc: SceneController) => {

    let onObject:boolean;


    var inputMap: Record<ActionEvent["sourceEvent"]["key"], ActionEvent | false> = {};
    sc.scene.actionManager = new ActionManager(sc.scene);
    sc.scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, function (evt) {
        console.log("evt: ", evt);
        inputMap[evt.sourceEvent.code] = evt.sourceEvent.type == "keydown" ? evt : false;
      })
    );
    sc.scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.code] = evt.sourceEvent.type == "keydown" ? evt: false
      })
    );

    let keydown = false;
    sc.scene.onBeforeRenderObservable.add(() => {
      const heroSpeed = 3;
      let speedMult = 1;
      const heroSpeedBackwards = 1;
      const heroRotationSpeed = 0.1;
    if(!sc.mapController?.meshDict.ground.mesh) return
      onObject = sc.playerController.mesh.intersectsMesh(sc.mapController.meshDict.ground.mesh, true)
      if (inputMap["Space"] && onObject) {
        // jumpKeyDown = true;
        // isJumping = true;
        sc.playerController.aggregate.body.applyImpulse(
          new Vector3(0, 300, 0),
          sc.playerController.mesh.getAbsolutePosition()
        );
      }
      if (inputMap["KeyW"] && inputMap["KeyW"].sourceEvent.shiftKey) {
        speedMult = 2
      }
      if (inputMap["KeyW"]) {

        const vec = sc.playerController.mesh.forward
          .scale(heroSpeed * speedMult)
          .add(gravity);

        sc.playerController.aggregate.body.setLinearVelocity(vec);
        keydown = true;
      } else if (inputMap["KeyS"]) {
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
}