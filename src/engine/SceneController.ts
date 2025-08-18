import {
    FreeCamera, DirectionalLight, Engine, HavokPlugin, Scene, Vector3,
    WebGPUEngine, PhysicsHelper, MeshBuilder, StandardMaterial, Color3,
    PhysicsAggregate, PhysicsShapeType, HemisphericLight
} from '@babylonjs/core';

import { Game } from './Game';
import { GuiController } from './GuiController';
import { createInputController } from './InputController';
import { MapController } from './levelLoader/MapController';
import { PlayerController } from './PlayerController';
import { SoundController } from './SoundController';
import { CameraController } from './CameraController';
import { Physics2DConstraintSystem } from './Physics2DConstraintSystem';
import { ProjectileController } from './ProjectileController';
import { HealthBarSystem } from './HealthBarSystem';

export class SceneController {
  private _scene: Scene;
  _engine: WebGPUEngine;
  private _playerController: PlayerController;
  private _mapController?: MapController;
  private _cameraController?: CameraController;
   guiController?: GuiController;
  physEngine;
  physicsHelper: PhysicsHelper; // For explosion effects
  soundController: SoundController;
  private physics2DSystem?: Physics2DConstraintSystem;
  private _projectileController?: ProjectileController;
  private _healthBarSystem?: HealthBarSystem;

  // raycastInfo
  setCameraController(cameraController: CameraController) {
    this._cameraController = cameraController;

    // Initialize projectile controller once camera is set (but use player for projectiles)
    if (this._cameraController && !this._projectileController) {
      this._projectileController = new ProjectileController(
        this._scene,
        this,
        this._playerController // Use player controller instead of camera
      );
      console.log('🎯 ProjectileController initialized for 2D platformer');
    }
  }
  get cameraController() {
    if(!this._cameraController) {
      console.error("CameraController is not set in SceneController");
      throw new Error("CameraController is not set in SceneController");
    }
    return this._cameraController;
  }
  setMapController(mapController: MapController) {
    this._mapController = mapController;
  }
  get mapController() {
    return this._mapController;
  }
  get playerController() {
    return this._playerController;
  }

  get projectileController() {
    if (!this._projectileController) {
      throw new Error("ProjectileController is not initialized - camera must be set first");
    }
    return this._projectileController;
  }

  canvas: HTMLCanvasElement
  game:Game
  constructor(engine: WebGPUEngine, hk: HavokPlugin, soundController: SoundController, canvas: HTMLCanvasElement, gameController: Game) {
    this._scene = new Scene(engine);
    this.soundController = soundController
    this._scene.collisionsEnabled = true;
    this._scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
    this._engine = engine;
    this.physEngine = hk;

    // Initialize PhysicsHelper for explosion effects
    this.physicsHelper = new PhysicsHelper(this._scene);

    // Store reference to this controller in scene metadata for access by other components
    this._scene.metadata = { sceneController: this };

    // Initialize the 2D physics constraint system IMMEDIATELY after enabling physics
    this.physics2DSystem = new Physics2DConstraintSystem(this._scene, hk);

    this.guiController = new GuiController(this)
    this.canvas = canvas
    this.game = gameController
    // todo: this comes after physics
    this._playerController = new PlayerController(this._scene, hk, this.soundController);
    // this.createInput();
  }
  get scene() {
    return this._scene;
  }

  /**
   * Get the 2D physics constraint system for manual body registration
   */
  get physics2DConstraintSystem() {
    return this.physics2DSystem;
  }

  /**
   * Get the health bar system for managing entity health displays
   */
  get healthBarSystem() {
    return this._healthBarSystem;
  }

  async asyncInit()  {
    await this.guiController?.loadGui()
    this.createLight(this._scene)

    // Initialize simple health bar system
    this._healthBarSystem = new HealthBarSystem(this._scene);
    console.log('💚 Simple HealthBarSystem initialized');
  }
  setPlayerPos(pos: Vector3, props: any) {
    this._playerController.setInitialPosition(pos, props);
  }
  createInputController = createInputController;
  createInput() {
    createInputController(this);
  }

  private createLight(scene: Scene) {
    // Add ambient hemispheric light for overall scene illumination
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.6; // Moderate ambient lighting
    hemisphericLight.diffuse = new Color3(1, 1, 1); // White light
    hemisphericLight.groundColor = new Color3(0.3, 0.3, 0.4); // Slightly blue ground reflection

    // Keep directional light but make it softer and angled
    const directionalLight = new DirectionalLight("DirectionalLight", new Vector3(-0.3, -0.7, -0.2), scene);
    directionalLight.position = new Vector3(50, 100, 50); // Angled position
    directionalLight.intensity = 0.4; // Reduced intensity to prevent harsh shadows
    directionalLight.diffuse = new Color3(1.0, 0.95, 0.8); // Warm white light

    console.log('🌞 Improved scene lighting created: Hemispheric + Soft Directional');
    return { hemisphericLight, directionalLight };
  }
  public testScene(camera: FreeCamera): void {
    // Camera will now follow player automatically via CameraController
    // Initial target setup can be done here if needed
    camera.setTarget(this._playerController.mesh.position);
  }

  public createGroundScene() {}
}
