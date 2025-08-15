import { Vector3, Ray, PickingInfo, RayHelper } from "@babylonjs/core";
import { SceneController } from "./SceneController";

interface MovementInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  sprint: boolean;
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

  constructor(private sc: SceneController) {}

  public update(input: MovementInput, onGround: boolean): void {
    // Get current velocity to preserve Y component (for gravity/jumping)
    const currentVelocity = this.sc.playerController.aggregate.body.getLinearVelocity();
    let horizontalVelocity = currentVelocity.x;
    let verticalVelocity = currentVelocity.y;

    // Determine speed multiplier
    const speedMult = input.sprint ? this.sprintMultiplier : this.normalMultiplier;

    // Check for walls in movement direction
    const onWall = this.checkWallCollision(input);

    // Track when we leave the ground to save momentum
    if (this.wasOnGroundLastFrame && !onGround) {
      // Just left the ground - save current horizontal velocity
      this.lastGroundHorizontalVelocity = horizontalVelocity;
    }
    this.wasOnGroundLastFrame = onGround;

    // Track if we've ever been on ground
    if (onGround) {
      this.hasEverBeenOnGround = true;
    }

    if (onGround) {
      // On ground - normal movement with full control
      horizontalVelocity = this.handleGroundMovement(input, speedMult);
      // Update the last ground velocity for when we jump
      this.lastGroundHorizontalVelocity = horizontalVelocity;
    } else {
      // In air - limited control with momentum preservation
      horizontalVelocity = this.handleAirMovement(input, horizontalVelocity, speedMult);
    }

    // Handle jumping - can jump while moving, standing still, or on walls
    if (input.jump) {
      if (onGround && !this.isJumping) {
        // Normal ground jump
        verticalVelocity = this.jumpSpeed;
        this.isJumping = true;
      } else if (onWall && !onGround && !this.isJumping) {
        // Wall jump
        verticalVelocity = this.wallJumpSpeed;
        // Push player away from wall
        horizontalVelocity = -this.wallJumpDirection * this.heroSpeed * speedMult;
        this.isJumping = true;
      }
    }

    // Reset jumping flag when landing or touching wall
    if ((onGround || onWall) && currentVelocity.y <= 0) {
      this.isJumping = false;
    }

    // Set velocity with both horizontal and vertical movement
    const newVelocity = new Vector3(horizontalVelocity, verticalVelocity, 0);
    this.sc.playerController.aggregate.body.setLinearVelocity(newVelocity);

    // Lock physics to 2D - prevent movement/rotation on unwanted axes
    this.sc.playerController.aggregate.body.setAngularVelocity(Vector3.Zero());

    // Get current position and lock Z-axis to 0 (or whatever Z value you want)
    const currentPosition = this.sc.playerController.mesh.position;
    if (currentPosition.z !== 0) {
      this.sc.playerController.mesh.position.z = 0;
    }
  }  private handleGroundMovement(input: MovementInput, speedMult: number): number {
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

  private checkWallCollision(input: MovementInput): boolean {
    // Reset wall jump direction
    this.wallJumpDirection = 0;

    const playerPosition = this.sc.playerController.mesh.position;
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
      // No horizontal movement, no wall detection - hide ray
      if (this.wallRayHelper) {
        this.wallRayHelper.hide();
      }
      return false;
    }

    // Create ray
    const ray = new Ray(rayOrigin, rayDirection);

    // Create or update visual ray helper
    if (!this.wallRayHelper) {
      this.wallRayHelper = new RayHelper(ray);
      this.wallRayHelper.show(this.sc.scene);
    } else {
      // Update existing ray
      this.wallRayHelper.attachToMesh(
        this.sc.playerController.mesh,
        rayDirection,
        new Vector3(0, 0.5, 0), // Offset from player center
        this.wallDetectionDistance
      );
      this.wallRayHelper.show(this.sc.scene);
    }

    // Get all collideable meshes
    const collideableMeshes = this.sc.scene.meshes.filter(mesh => {
      return mesh.metadata?.gltf?.extras?.collideable === true;
    });

    if (collideableMeshes.length === 0) return false;

    // Check for wall collision
    const hitInfo = ray.intersectsMeshes(collideableMeshes);

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
