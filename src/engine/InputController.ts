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
        if (kbInfo.event.code === "KeyE") {
          // POC: Toggle explosion mode for testing
          console.log("POC: E key pressed - toggling explosion mode");
          // The actual toggling is handled in SceneController
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
          // POC: Create simple test box for explosion testing (overriding cutscene stop)
          console.log("POC: X key pressed - creating simple test box");
          // Note: This temporarily overrides the cutscene stop functionality
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
        if (kbInfo.event.code === "F1") {
          // Alternative fire key - useful for some keyboard layouts
          try {
            const projectile = sc.projectileController.fireProjectile();
            if (projectile) {
              console.log("🚀 Projectile fired successfully (F1)");
            } else {
              console.log("⚠️ Could not fire projectile (max limit reached)");
            }
          } catch (error) {
            console.error("Error firing projectile:", error);
          }
        }
        if (kbInfo.event.code === "KeyS") {
          // Debug: Test footstep sequence for testing
          sc.soundController.playFootsteps();
          console.log("Debug: Footstep sequence played");
        }
        if (kbInfo.event.code === "Space") {
          sc.playerController.shoot()
          // Fire projectile
          // try {
          //   // const projectile = sc.projectileController.fireProjectile();
          //   if (projectile) {
          //     console.log("🚀 Projectile fired successfully");
          //   } else {
          //     console.log("⚠️ Could not fire projectile (max limit reached)");
          //   }
          // } catch (error) {
          //   console.error("Error firing projectile:", error);
          // }
        }
        if (kbInfo.event.code === "Digit1") {
          // Digit1 key is now available for other uses
          console.log("Digit1 pressed - available for new functionality");
        }
        if (kbInfo.event.code === "Digit2") {
          // Digit2 key is now available for other uses
          console.log("Digit2 pressed - available for new functionality");
        }
        if (kbInfo.event.code === "Digit3") {
          // Digit3 key is now available for other uses
          console.log("Digit3 pressed - available for new functionality");
        }
        if (kbInfo.event.code === "Digit4") {
          // Digit4 key is now available for other uses
          console.log("Digit4 pressed - available for new functionality");
        }
        if (kbInfo.event.code === "Digit5") {
          // Digit5 key is now available for other uses
          console.log("Digit5 pressed - available for new functionality");
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
  let lastFireTime = 0;
  const fireRate = 300; // Minimum time between shots in milliseconds

  sc.scene.onBeforeRenderObservable.add(() => {
    // Get ground detection state from the unified ray system
    const groundState = sc.playerController.getGroundDetectionState();
    const onGround = groundState.isOnGround;

    // Gather input state (W = jump, SPACE = shoot, F1 = shoot)
    const movementInput = {
      moveLeft: !!inputMap["KeyA"],
      moveRight: !!inputMap["KeyD"],
      jump: !!inputMap["KeyW"], // Changed from Space to W
      sprint: !!inputMap.ShiftLeft,
      shoot: !!inputMap["Space"] || !!inputMap["F1"] // Add shooting input
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

    // Handle shooting input with rate limiting
    if (movementInput.shoot) {
      const currentTime = performance.now();
      if (currentTime - lastFireTime >= fireRate) {
        try {
          const projectile = sc.projectileController.fireProjectile();
          if (projectile) {
            lastFireTime = currentTime;
            console.log("🚀 Projectile fired (continuous)");
          }
        } catch (error) {
          console.error("Error firing projectile in render loop:", error);
        }
      }
    }

    // Update keydown state for other systems that might need it
    keydown = movementInput.moveLeft || movementInput.moveRight;
  });
};
