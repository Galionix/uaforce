/**
 * Physics2DConstraintSystem - Global 2D Physics Enforcement for Side-Scroller Games
 *
 * PROBLEM SOLVED:
 * - Boxes and physics objects were moving/falling in Z-axis, breaking 2D side-scroller gameplay
 * - Manual object-by-object constraints were inefficient and error-prone
 * - Havok physics engine doesn't have native 2D-only mode
 *
 * SOLUTION:
 * - Engine-level 2D constraint system that automatically constrains ALL physics bodies
 * - Globally disables Z-axis movement and rotation for all physics objects
 * - Automatic registration of new physics bodies via scene observables
 * - Real-time constraint enforcement at 60fps to catch physics drift
 * - Zero configuration required - works automatically for all physics objects
 *
 * FEATURES:
 * - Automatic Z-axis position locking
 * - Z-velocity constraint enforcement
 * - Z-axis rotation prevention (allows only Y-axis rotation for facing direction)
 * - 2D-only gravity enforcement
 * - Performance monitoring and debug logging
 * - Cleanup on disposal
 *
 * USAGE:
 * - Automatically initialized in SceneController after physics enablement
 * - All new PhysicsAggregates are automatically constrained to 2D
 * - Manual registration available for existing bodies via registerPhysicsBody()
 * - Debug mode available for monitoring constraint enforcement
 */

import {
  Scene,
  Vector3,
  PhysicsAggregate,
  PhysicsBody,
  HavokPlugin,
  Observer
} from '@babylonjs/core';
import Logger, { LogCategory, LogLevel } from '../utils/logger';

/**
 * Physics2DConstraintSystem - Globally enforces 2D physics constraints
 *
 * This system automatically constrains all physics bodies to 2D movement by:
 * 1. Intercepting physics body creation
 * 2. Applying Z-axis constraints automatically
 * 3. Monitoring and correcting Z-axis drift
 * 4. Providing engine-level 2D physics enforcement
 */
export class Physics2DConstraintSystem {
  private scene: Scene;
  private havokPlugin: HavokPlugin;
  private constrainedBodies = new Set<PhysicsBody>();
  private beforeRenderObserver?: Observer<Scene>;
  private readonly CONSTRAINT_TOLERANCE = 0.01; // How much Z drift to allow before correction
  private readonly UPDATE_FREQUENCY = 16; // ~60fps constraint enforcement
  private constraintUpdateInterval?: NodeJS.Timeout;

  constructor(scene: Scene, havokPlugin: HavokPlugin) {
    this.scene = scene;
    this.havokPlugin = havokPlugin;
    this.initialize();
  }

  /**
   * Initialize the 2D constraint system
   */
  private initialize(): void {
    Logger.physics.info('Initializing Physics2DConstraintSystem - All physics will be constrained to 2D');

    // Override gravity to only affect Y axis
    this.enforce2DGravity();

    // Set up automatic body registration
    this.setupAutomaticBodyRegistration();

    // Start constraint enforcement loop
    this.startConstraintEnforcement();
  }

  /**
   * Ensure gravity only affects Y axis
   */
  private enforce2DGravity(): void {
    const currentGravity = this.scene.getPhysicsEngine()?.gravity;
    if (currentGravity && currentGravity.z !== 0) {
      Logger.physics.info(`Constraining gravity to 2D: was ${currentGravity.toString()}, now (${currentGravity.x}, ${currentGravity.y}, 0)`);
      this.scene.getPhysicsEngine()?.setGravity(new Vector3(currentGravity.x, currentGravity.y, 0));
    }
  }

  /**
   * Set up automatic registration of new physics bodies
   */
  private setupAutomaticBodyRegistration(): void {
    // Use scene observables to detect new physics aggregates
    this.scene.onNewMeshAddedObservable.add((mesh) => {
      // Check if mesh has physics after a short delay to allow physics setup
      setTimeout(() => {
        // Check if mesh has a physics aggregate attached
        const aggregate = (mesh as any).physicsAggregate;
        if (aggregate && aggregate.body) {
          this.registerPhysicsBody(aggregate.body, mesh.name);
        }
      }, 50);
    });

    Logger.physics.debug('Set up automatic physics body registration for 2D constraints');
  }

  /**
   * Register a physics body for 2D constraint enforcement
   */
  public registerPhysicsBody(body: PhysicsBody, bodyName: string = 'Unknown'): void {
    if (this.constrainedBodies.has(body)) {
      return; // Already registered
    }

    try {
      // Apply initial 2D constraints
      this.apply2DConstraintsToBody(body, bodyName);

      // Add to tracking set
      this.constrainedBodies.add(body);

      Logger.physics.debug(`Registered physics body for 2D constraints: ${bodyName}`);
    } catch (error) {
      Logger.physics.error(`Failed to register physics body ${bodyName} for 2D constraints:`, error);
    }
  }

  /**
   * Apply 2D constraints to a specific physics body
   */
  private apply2DConstraintsToBody(body: PhysicsBody, bodyName: string): void {
    if (!body) return;

    try {
      // Lock Z-axis rotation and heavily dampen Y-axis rotation for boxes
      const currentMassProps = body.getMassProperties();

      // For boxes/cubes, we want to minimize spinning while allowing some Y rotation
      const isBox = bodyName.toLowerCase().includes('box') ||
                   bodyName.toLowerCase().includes('crate') ||
                   bodyName.toLowerCase().includes('barrel') ||
                   bodyName.toLowerCase().includes('container');

      body.setMassProperties({
        mass: currentMassProps.mass,
        inertia: new Vector3(
          0.01, // Very low X-axis inertia to prevent tilting/pitching
          isBox ? 0.1 : (currentMassProps.inertia?.y || 1), // Reduce Y-axis inertia for boxes to prevent spinning
          0 // Zero Z-axis inertia = no rotation around Z
        ),
        centerOfMass: currentMassProps.centerOfMass ?
          new Vector3(currentMassProps.centerOfMass.x, currentMassProps.centerOfMass.y, 0) :
          undefined
      });

      // CRITICAL: Always set Z constraint to 0 for true 2D gameplay
      // This prevents issues with meshes loaded at non-zero Z positions
      (body as any)._constraint2D_initialZ = 0;
      (body as any)._constraint2D_isBox = isBox; // Store box type for rotation damping

      // Immediately move body to Z=0 if it's not already there
      if (body.transformNode) {
        body.transformNode.position.z = 0;
      }

      Logger.physics.debug(`Applied 2D constraints to ${bodyName} (Z locked at 0, box rotation damping: ${isBox})`);
    } catch (error) {
      Logger.physics.error(`Failed to apply 2D constraints to ${bodyName}:`, error);
    }
  }

  /**
   * Start the constraint enforcement loop
   */
  private startConstraintEnforcement(): void {
    // Use setInterval for consistent timing
    this.constraintUpdateInterval = setInterval(() => {
      this.enforceAllConstraints();
    }, this.UPDATE_FREQUENCY);

    Logger.physics.debug(`Started 2D constraint enforcement loop (${1000/this.UPDATE_FREQUENCY}fps)`);
  }

  /**
   * Enforce 2D constraints on all registered bodies
   */
  private enforceAllConstraints(): void {
    for (const body of this.constrainedBodies) {
      try {
        this.enforceBodyConstraints(body);
      } catch (error) {
        Logger.physics.error('Error enforcing 2D constraints on body:', error);
        // Remove problematic body from tracking
        this.constrainedBodies.delete(body);
      }
    }
  }

  /**
   * Enforce 2D constraints on a single body
   */
  private enforceBodyConstraints(body: PhysicsBody): void {
    if (!body.transformNode) return;

    // Always enforce Z=0 for true 2D gameplay
    const targetZ = 0;
    const currentPosition = body.transformNode.position;

    // Check if Z position has drifted
    if (Math.abs(currentPosition.z - targetZ) > this.CONSTRAINT_TOLERANCE) {
      // Reset Z position to 0
      body.transformNode.position.z = targetZ;

      // Reset Z velocity
      const velocity = body.getLinearVelocity();
      if (velocity && velocity.z !== 0) {
        body.setLinearVelocity(new Vector3(velocity.x, velocity.y, 0));
      }
    }

    // Handle angular velocity constraints
    const angularVel = body.getAngularVelocity();
    if (angularVel) {
      const isBox = (body as any)._constraint2D_isBox || false;

      // Always reset Z angular velocity (no Z-axis rotation allowed)
      // Also reset X angular velocity (no tilting/pitching allowed in 2D)
      let newAngularVel = new Vector3(0, angularVel.y, 0); // Only Y-axis rotation allowed

      // For boxes, heavily dampen Y-axis spinning to prevent excessive rotation from explosions
      if (isBox && Math.abs(angularVel.y) > 2) { // If spinning faster than 2 rad/s
        newAngularVel.y = angularVel.y * 0.3; // Reduce to 30% of current speed
      }

      // Apply the constrained angular velocity if it changed
      if (!angularVel.equals(newAngularVel)) {
        body.setAngularVelocity(newAngularVel);
      }
    }

    // Ensure rotation stays 2D (only Y-axis rotation allowed, but limited for boxes)
    if (body.transformNode.rotation) {
      const rotation = body.transformNode.rotation;

      // Force X and Z rotations to always be 0 for true 2D gameplay
      if (rotation.x !== 0 || rotation.z !== 0) {
        body.transformNode.rotation.x = 0;
        body.transformNode.rotation.z = 0;
      }

      // For boxes, also limit extreme Y rotations to prevent disorienting spinning
      const isBox = (body as any)._constraint2D_isBox || false;
      if (isBox && Math.abs(rotation.y) > Math.PI * 4) { // If rotated more than 4 full turns
        // Normalize to equivalent angle within reasonable range
        body.transformNode.rotation.y = rotation.y % (Math.PI * 2);
      }
    }
  }

  /**
   * Manually register an existing physics aggregate
   */
  public registerAggregate(aggregate: PhysicsAggregate, name?: string): void {
    if (aggregate.body) {
      this.registerPhysicsBody(aggregate.body, name || aggregate.transformNode?.name || 'Manual Registration');
    }
  }

  /**
   * Remove a physics body from 2D constraint tracking
   */
  public unregisterPhysicsBody(body: PhysicsBody): void {
    this.constrainedBodies.delete(body);
    Logger.physics.debug('Unregistered physics body from 2D constraints');
  }

  /**
   * Get statistics about the constraint system
   */
  public getStats(): { trackedBodies: number; updateFrequency: number } {
    return {
      trackedBodies: this.constrainedBodies.size,
      updateFrequency: 1000 / this.UPDATE_FREQUENCY
    };
  }

  /**
   * Cleanup the constraint system
   */
  public dispose(): void {
    if (this.constraintUpdateInterval) {
      clearInterval(this.constraintUpdateInterval);
    }

    if (this.beforeRenderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
    }

    this.constrainedBodies.clear();
    Logger.physics.info('Physics2DConstraintSystem disposed');
  }

  /**
   * Enable debug logging for the constraint system
   */
  public enableDebugMode(): void {
    Logger.setLevel(LogCategory.PHYSICS, LogLevel.DEBUG);
    Logger.physics.debug('2D Constraint System Debug Mode Enabled');

    // Log stats every 5 seconds
    setInterval(() => {
      const stats = this.getStats();
      Logger.physics.debug(`2D Constraint Stats: ${stats.trackedBodies} bodies tracked, ${stats.updateFrequency.toFixed(1)}fps updates`);
    }, 5000);
  }
}
