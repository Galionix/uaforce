import {
  ActionEvent,
  ActionManager,
  ExecuteCodeAction,
  KeyboardEventTypes,
  Vector3,
} from "@babylonjs/core";

import { GlobalEventBus } from "./event-bus";
import { SceneController } from "./SceneController";
import { PlayerMovementController } from "./PlayerMovementController";

export const createInputController = (sc: SceneController) => {
  console.log("createInputController");
  var inputMap: Record<ActionEvent["sourceEvent"]["key"], ActionEvent | false> =
    {};

  // Create the movement controller
  const movementController = new PlayerMovementController(sc);

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
        if (kbInfo.event.code === "KeyK") {
          // Debug: Trigger death for testing
          sc.playerController.handleDeath();
          console.log("Debug: Death triggered manually");
        }
        if (kbInfo.event.code === "KeyL") {
          // Debug: Display current lives
          sc.playerController.displayLives();
        }
        if (kbInfo.event.code === "KeyR") {
          // Debug: Toggle ray visualization
          sc.playerController.toggleRayVisualization(true);
          console.log("Debug: Ray visualization toggled");
        }
        if (kbInfo.event.code === "KeyP") {
          // Debug: Play pain sound for testing
          sc.soundController.playPain();
          console.log("Debug: Pain sound played");
        }
        if (kbInfo.event.code === "KeyJ") {
          // Debug: Play jump sound for testing
          sc.soundController.playJump();
          console.log("Debug: Jump sound played");
        }
        if (kbInfo.event.code === "KeyU") {
          // Debug: Play UI click sound for testing
          sc.soundController.playUIClick();
          console.log("Debug: UI click sound played");
        }
        if (kbInfo.event.code === "KeyF") {
          // Debug: Play landing sound for testing
          sc.soundController.playLanding();
          console.log("Debug: Landing sound played");
        }
        if (kbInfo.event.code === "KeyS") {
          // Debug: Test footstep sequence for testing
          sc.soundController.playFootsteps();
          console.log("Debug: Footstep sequence played");
        }
        if (kbInfo.event.code === "Space") {
          // Shooting with SPACE key
          if (sc.projectileSystem && sc.playerController.mesh) {
            // Calculate shoot direction based on player facing direction
            const playerPos = sc.playerController.mesh.position;
            const facingLeft = sc.playerController.getFacingDirection();
            
            // Calculate target position - shoot horizontally in the direction player is facing
            // facingLeft = true means positive X direction, facingLeft = false means negative X direction
            const shootDistance = 10; // How far to aim
            const targetPosition = playerPos.clone().add(
              new Vector3(facingLeft ? shootDistance : -shootDistance, 0, 0)
            );
            
            console.log("SPACE pressed! Attempting to shoot bullet...");
            console.log("Player position:", playerPos);
            console.log("Facing left:", facingLeft);
            console.log("Target position:", targetPosition);
            
            // Fire using playerShoot method
            sc.projectileSystem.playerShoot(sc.playerController.mesh, targetPosition, 'bullet');
            
            console.log("Player shot bullet towards:", targetPosition);
          } else {
            console.log("Cannot shoot - missing projectileSystem or playerController.mesh");
          }
        }
        if (kbInfo.event.code === "Digit1") {
          // Test rocket projectile
          if (sc.projectileSystem && sc.playerController.mesh) {
            const playerPos = sc.playerController.mesh.position;
            const facingLeft = sc.playerController.getFacingDirection();
            const shootDistance = 15;
            const targetPosition = playerPos.clone().add(
              new Vector3(facingLeft ? shootDistance : -shootDistance, 0, 0)
            );
            
            sc.projectileSystem.playerShoot(sc.playerController.mesh, targetPosition, 'rocket');
            console.log("Player shot rocket towards:", targetPosition);
          }
        }
        if (kbInfo.event.code === "Digit2") {
          // Test grenade throw
          if (sc.projectileSystem && sc.playerController.mesh) {
            const playerPos = sc.playerController.mesh.position;
            const facingLeft = sc.playerController.getFacingDirection();
            const throwDistance = 8;
            const targetPosition = playerPos.clone().add(
              new Vector3(facingLeft ? throwDistance : -throwDistance, -2, 0) // Aim slightly down for arc
            );
            
            sc.projectileSystem.throwGrenade(playerPos, targetPosition);
            console.log("Player threw grenade towards:", targetPosition);
          }
        }
        if (kbInfo.event.code === "Digit3") {
          // Test fireball spell
          if (sc.projectileSystem && sc.playerController.mesh) {
            const playerPos = sc.playerController.mesh.position;
            const facingLeft = sc.playerController.getFacingDirection();
            const shootDistance = 12;
            const targetPosition = playerPos.clone().add(
              new Vector3(facingLeft ? shootDistance : -shootDistance, 0, 0)
            );
            
            sc.projectileSystem.castSpell(sc.playerController.mesh, 'fireball', targetPosition);
            console.log("Player cast fireball towards:", targetPosition);
          }
        }
        if (kbInfo.event.code === "Digit4") {
          // Test timed bomb throw
          if (sc.projectileSystem && sc.playerController.mesh) {
            const playerPos = sc.playerController.mesh.position;
            const facingLeft = sc.playerController.getFacingDirection();
            const throwDistance = 5; // Shorter throw for timed bomb
            const direction = new Vector3(facingLeft ? 1 : -1, 0.3, 0).normalize(); // Slight upward angle
            
            sc.projectileSystem.throwTimedBomb(playerPos, direction);
            console.log("Player threw timed bomb in direction:", direction);
          }
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
    // Get ground detection state from the unified ray system
    const groundState = sc.playerController.getGroundDetectionState();
    const onGround = groundState.isOnGround;

    // Gather input state (W = jump, SPACE = shoot)
    const movementInput = {
      moveLeft: !!inputMap["KeyA"],
      moveRight: !!inputMap["KeyD"],
      jump: !!inputMap["KeyW"], // Changed from Space to W
      sprint: !!inputMap.ShiftLeft
    };

    // Update movement using the movement controller and get the movement output
    const movementOutput = movementController.update(movementInput, onGround);

    // Apply movement to the player controller
    sc.playerController.setVelocity(movementOutput.velocity);

    // Apply facing direction if it changed
    if (movementOutput.facingLeft !== null) {
      sc.playerController.setFacingDirection(movementOutput.facingLeft);
    }

    // Trigger camera effects
    if (movementOutput.shouldTriggerJumpImpulse) {
      sc.cameraController.jumpImpulse();
    }

    if (movementOutput.shouldTriggerJumpSound) {
      sc.soundController.playJump();
    }

    if (movementOutput.shouldTriggerWallJumpShake) {
      sc.cameraController.wallJumpShake(movementOutput.shouldTriggerWallJumpShake.direction);
    }

    if (movementOutput.shouldTriggerLandingImpact) {
      try {
        sc.cameraController.landingImpact(movementOutput.shouldTriggerLandingImpact.strength);
      } catch (error) {
        console.error("Error calling camera landing impact:", error);
      }
    }

    if (movementOutput.shouldTriggerLandingSound) {
      // Pass impact strength for dynamic volume if available
      const impactStrength = movementOutput.shouldTriggerLandingImpact?.strength;
      sc.soundController.playLanding(impactStrength);
    }

    // Handle footstep sounds
    if (movementOutput.shouldStartFootsteps) {
      sc.soundController.startFootstepLoop(movementOutput.isSprinting);
    } else if (movementOutput.shouldStopFootsteps) {
      sc.soundController.stopFootstepLoop();
    }

    // Update keydown state for other systems that might need it
    keydown = movementInput.moveLeft || movementInput.moveRight;
  });
};
