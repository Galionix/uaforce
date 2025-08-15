import { Vector3, Ray, PickingInfo, RayHelper } from "@babylonjs/core";
import { SceneController } from "./SceneController";
import Logger from "../utils/logger";

interface MovementInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  sprint: boolean;
}

interface MovementOutput {
  velocity: Vector3;
  facingLeft: boolean | null; // null means no change in facing direction
  shouldTriggerJumpImpulse: boolean;
  shouldTriggerJumpSound: boolean;
  shouldTriggerWallJumpShake: { direction: number } | null;
  shouldTriggerLandingImpact: { strength: number } | null;
  shouldTriggerLandingSound: boolean;
  shouldStartFootsteps: boolean;
  shouldStopFootsteps: boolean;
  isMovingOnGround: boolean;
  isSprinting: boolean;
}

export class PlayerMovementController {
  private heroSpeed = 3;
  private jumpSpeed = 6;
  private wallJumpSpeed = 10; // Slightly higher for wall jumps
  private airControlForce = 0.5; // Half force for air control
  private sprintMultiplier = 4;
  private normalMultiplier = 2;

  private lastGroundHorizontalVelocity = 0; // Remember horizontal speed when leaving ground
  private wasOnGroundLastFrame = false;
  private isJumping = false;
  private hasEverBeenOnGround = false; // Track if player has ever touched ground
  private wallDetectionDistance = 0.6; // How far to check for walls

  private wallJumpDirection = 0; // -1 for left wall, 1 for right wall, 0 for no wall
  private wallRayHelper?: RayHelper; // Visual ray for wall detection

  // Wall jump cooldown to prevent spamming
  private lastWallJumpTime = 0;
  private wallJumpCooldown = 500; // 500ms cooldown between wall jumps

  // Previous state tracking for camera effects
  private wasJumpingLastFrame = false;
  private wasOnWallLastFrame = false;

  // Track maximum fall velocity for better impact calculation
  private maxFallVelocity = 0;
  private isCurrentlyFalling = false;
  private wasPlayerJumping = false; // Track if this fall started from a jump

  constructor(private sc: SceneController) {}

  public update(input: MovementInput, onGround: boolean): MovementOutput {
    // Get current velocity to preserve Y component (for gravity/jumping)
    const currentVelocity = this.sc.playerController.getVelocity();
    let horizontalVelocity = currentVelocity.x;
    let verticalVelocity = currentVelocity.y;

    // Initialize movement output
    const movementOutput: MovementOutput = {
      velocity: Vector3.Zero(),
      facingLeft: null,
      shouldTriggerJumpImpulse: false,
      shouldTriggerJumpSound: false,
      shouldTriggerWallJumpShake: null,
      shouldTriggerLandingImpact: null,
      shouldTriggerLandingSound: false,
      shouldStartFootsteps: false,
      shouldStopFootsteps: false,
      isMovingOnGround: false,
      isSprinting: false
    };

    // Determine speed multiplier
    const speedMult = input.sprint ? this.sprintMultiplier : this.normalMultiplier;

    // Check for walls in movement direction
    const onWall = this.checkWallCollision(input);

    // Track when we leave the ground to save momentum
    if (this.wasOnGroundLastFrame && !onGround) {
      // Just left the ground - save current horizontal velocity
      this.lastGroundHorizontalVelocity = horizontalVelocity;
      // Start tracking fall velocity
      this.isCurrentlyFalling = true;
      this.maxFallVelocity = 0;
      this.wasPlayerJumping = this.isJumping; // Remember if this was a jump
      Logger.playerMovement.debug(`Player left the ground - starting fall tracking (was jumping: ${this.wasPlayerJumping})`);
    }

    // Track maximum fall velocity while in air
    if (!onGround && this.isCurrentlyFalling && currentVelocity.y < 0) {
      const currentFallSpeed = Math.abs(currentVelocity.y);
      if (currentFallSpeed > this.maxFallVelocity) {
        this.maxFallVelocity = currentFallSpeed;
      }
    }

    // Debug: Log ground state changes
    if (this.wasOnGroundLastFrame !== onGround) {
      Logger.playerMovement.debug(`Ground state changed: ${this.wasOnGroundLastFrame ? 'was on ground' : 'was in air'} -> ${onGround ? 'now on ground' : 'now in air'}`);
    }

    // Track if we've ever been on ground
    if (onGround) {
      this.hasEverBeenOnGround = true;
    }

    if (onGround) {
      // On ground - normal movement with full control
      horizontalVelocity = this.handleGroundMovement(input, speedMult);
      // Update the last ground velocity for when we jump
      this.lastGroundHorizontalVelocity = horizontalVelocity;

      // Set facing direction based on movement
      movementOutput.facingLeft = this.getFacingDirection(input);
    } else {
      // In air - limited control with momentum preservation
      horizontalVelocity = this.handleAirMovement(input, horizontalVelocity, speedMult);

      // Also update direction in air (for wall jumps and air control)
      movementOutput.facingLeft = this.getFacingDirection(input);
    }

    // Handle jumping - can jump while moving, standing still, or on walls
    if (input.jump) {
      if (onGround && !this.isJumping) {
        // Normal ground jump
        verticalVelocity = this.jumpSpeed;
        this.isJumping = true;
        Logger.playerMovement.debug(`Player started jumping from ground`);
        // Trigger camera jump impulse and sound
        movementOutput.shouldTriggerJumpImpulse = true;
        movementOutput.shouldTriggerJumpSound = true;
      } else if (onWall && !onGround) {
        // Wall jump - check cooldown to prevent spamming (allow even if already jumping for wall jump chains)
        const currentTime = Date.now();
        if (currentTime - this.lastWallJumpTime > this.wallJumpCooldown) {
          verticalVelocity = this.wallJumpSpeed;
          // Push player away from wall
          horizontalVelocity = -this.wallJumpDirection * this.heroSpeed * speedMult;
          this.isJumping = true;
          this.lastWallJumpTime = currentTime;
          Logger.playerMovement.debug(`Player started wall jumping`);
          // Trigger camera wall jump shake and sound
          movementOutput.shouldTriggerWallJumpShake = { direction: this.wallJumpDirection };
          movementOutput.shouldTriggerJumpSound = true;
        }
      }
    }

    // Check if we just landed (any landing from air to ground)
    if (onGround && !this.wasOnGroundLastFrame && currentVelocity.y <= 0) {
      // Use maximum fall velocity instead of current velocity for better impact calculation
      const landingSpeed = Math.max(Math.abs(currentVelocity.y), this.maxFallVelocity);

      // Reduce impact for intentional jumps vs pure falls
      let impactStrength;
      if (this.wasPlayerJumping) {
        // Gentler impact for jumps - divide by 6 and cap at 1.0
        impactStrength = Math.min(landingSpeed / 6, 1.0);
      } else {
        // Full impact for pure falls - divide by 4 and cap at 2.0
        impactStrength = Math.min(landingSpeed / 4, 2.0);
      }

      // Debug: Log detailed velocity info to understand the scaling
      Logger.playerMovement.debug(`=== LANDING DEBUG ===`);
      Logger.playerMovement.debug(`Was jumping: ${this.wasPlayerJumping}`);
      Logger.playerMovement.debug(`Raw Y velocity: ${currentVelocity.y.toFixed(3)}`);
      Logger.playerMovement.debug(`Max fall velocity: ${this.maxFallVelocity.toFixed(3)}`);
      Logger.playerMovement.debug(`Landing speed (max): ${landingSpeed.toFixed(3)}`);
      if (this.wasPlayerJumping) {
        Logger.playerMovement.debug(`Impact calculation (JUMP): ${landingSpeed.toFixed(3)} / 6 = ${(landingSpeed / 6).toFixed(3)}`);
        Logger.playerMovement.debug(`Final impact strength: ${impactStrength.toFixed(3)} (max 1.0)`);
      } else {
        Logger.playerMovement.debug(`Impact calculation (FALL): ${landingSpeed.toFixed(3)} / 4 = ${(landingSpeed / 4).toFixed(3)}`);
        Logger.playerMovement.debug(`Final impact strength: ${impactStrength.toFixed(3)} (max 2.0)`);
      }
      Logger.playerMovement.debug(`Will trigger camera: ${impactStrength > 0.05 ? 'YES' : 'NO'}`);

      // Always trigger camera impact for any landing (no special cases)
      if (impactStrength > 0.05) { // Only trigger if there's meaningful impact
        Logger.playerMovement.debug(`Player landed! Max fall speed: ${landingSpeed.toFixed(2)}, Impact strength: ${impactStrength.toFixed(2)} (${this.wasPlayerJumping ? 'JUMP' : 'FALL'})`);

        // Set landing impact and sound triggers
        movementOutput.shouldTriggerLandingImpact = { strength: impactStrength };
        movementOutput.shouldTriggerLandingSound = true;
      }

      // Reset fall tracking after landing
      this.isCurrentlyFalling = false;
      this.maxFallVelocity = 0;
      this.wasPlayerJumping = false;
    }

    // Reset jumping flag when landing on ground (not walls)
    if (onGround && currentVelocity.y <= 0) {
      // Debug: Log when jumping state resets
      if (this.isJumping) {
        Logger.playerMovement.debug(`Player stopped jumping (landed on ground)`);
      }
      this.isJumping = false;
    }

    // Set final velocity
    movementOutput.velocity = new Vector3(horizontalVelocity, verticalVelocity, 0);

    // Handle footstep logic
    const isMovingHorizontally = (input.moveLeft || input.moveRight);
    const isMovingOnGround = onGround && isMovingHorizontally && Math.abs(horizontalVelocity) > 0.1;
    
    movementOutput.isMovingOnGround = isMovingOnGround;
    movementOutput.isSprinting = input.sprint;

    // Determine if we should start or stop footsteps
    if (isMovingOnGround) {
      movementOutput.shouldStartFootsteps = true;
      movementOutput.shouldStopFootsteps = false;
    } else {
      movementOutput.shouldStartFootsteps = false;
      movementOutput.shouldStopFootsteps = true;
    }

    // Update state tracking AFTER all logic
    this.wasOnGroundLastFrame = onGround;

    return movementOutput;
  }

  private handleGroundMovement(input: MovementInput, speedMult: number): number {
    if (input.moveLeft) {
      // Move left (positive X direction)
      return this.heroSpeed * speedMult;
    } else if (input.moveRight) {
      // Move right (negative X direction)
      return -this.heroSpeed * speedMult;
    } else {
      // No horizontal input - stop horizontal movement
      return 0;
    }
  }

  private handleAirMovement(input: MovementInput, currentHorizontalVelocity: number, speedMult: number): number {
    if (input.moveLeft) {
      // Trying to move left in air
      const targetVelocity = this.heroSpeed * speedMult;
      const airControlAmount = (targetVelocity - currentHorizontalVelocity) * this.airControlForce;
      return currentHorizontalVelocity + airControlAmount;
    } else if (input.moveRight) {
      // Trying to move right in air
      const targetVelocity = -this.heroSpeed * speedMult;
      const airControlAmount = (targetVelocity - currentHorizontalVelocity) * this.airControlForce;
      return currentHorizontalVelocity + airControlAmount;
    } else {
      // No input in air
      if (!this.hasEverBeenOnGround) {
        // Player just spawned in air - no horizontal movement
        return 0;
      } else {
        // Maintain momentum from when we left ground
        return currentHorizontalVelocity;
      }
    }
  }

  private getFacingDirection(input: MovementInput): boolean | null {
    // Only change direction when there's horizontal input
    if (input.moveLeft) {
      return true; // Facing left
    } else if (input.moveRight) {
      return false; // Facing right
    } else {
      return null; // No change in direction
    }
  }

  private checkWallCollision(input: MovementInput): boolean {
    // Reset wall jump direction
    this.wallJumpDirection = 0;

    const playerPosition = this.sc.playerController.getPosition();
    const rayOrigin = playerPosition.clone();
    rayOrigin.y += 0.5; // Cast ray from middle of player, not feet

    let rayDirection = Vector3.Zero();

    // Determine ray direction based on movement input
    if (input.moveLeft) {
      rayDirection = new Vector3(1, 0, 0); // Left direction (positive X)
      this.wallJumpDirection = -1; // Left wall
    } else if (input.moveRight) {
      rayDirection = new Vector3(-1, 0, 0); // Right direction (negative X)
      this.wallJumpDirection = 1; // Right wall
    } else {
      // No horizontal movement, no wall detection
      return false;
    }

    // Create ray
    const wallRay = new Ray(rayOrigin, rayDirection);

    // Create or update visual ray helper
    if (!this.wallRayHelper) {
      this.wallRayHelper = new RayHelper(wallRay);
    //   this.wallRayHelper.show(this.sc.scene);
    //     this.wallRayHelper.attachToMesh(
    //     this.sc.playerController.mesh,
    //     rayDirection,
    //     new Vector3(0, 0.5, 0), // Offset from player center
    //     0.1
    //   );
    } else {
      // Dispose old ray helper and create new one with updated direction
    //   this.wallRayHelper.dispose();
    //   this.wallRayHelper = new RayHelper(wallRay);
    //   this.wallRayHelper.show(this.sc.scene);
    }

    // Get all collideable meshes
    const collideableMeshes = this.sc.scene.meshes.filter(mesh => {
      return mesh.metadata?.gltf?.extras?.collideable === true;
    });

    if (collideableMeshes.length === 0) return false;

    // Check for wall collision
    const hitInfo = wallRay.intersectsMeshes(collideableMeshes);

    if (hitInfo.length > 0 && hitInfo[0].pickedPoint) {
      const distance = Vector3.Distance(rayOrigin, hitInfo[0].pickedPoint);
      return distance <= this.wallDetectionDistance;
    }

    return false;
  }

  // Getters for debugging or UI
  public get isPlayerJumping(): boolean {
    return this.isJumping;
  }

  public get groundHorizontalVelocity(): number {
    return this.lastGroundHorizontalVelocity;
  }

  public get isOnWall(): number {
    return this.wallJumpDirection; // -1 for left wall, 1 for right wall, 0 for no wall
  }

  // Setters for configuration
  public setHeroSpeed(speed: number): void {
    this.heroSpeed = speed;
  }

  public setJumpSpeed(speed: number): void {
    this.jumpSpeed = speed;
  }

  public setAirControlForce(force: number): void {
    this.airControlForce = force;
  }
}
