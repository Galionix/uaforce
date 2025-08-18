import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  Color3,
  AbstractMesh
} from '@babylonjs/core';

export class HealthBarSystem {
  private scene: Scene;
  private healthBars: Map<string, SimpleHealthBar> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;

    // Update health bar positions and scaling every frame
    this.scene.registerBeforeRender(() => {
      this.updateHealthBars();
    });
  }

  /**
   * Create a simple health bar for a box with health metadata
   */
  public createHealthBar(mesh: AbstractMesh): void {
    if (!mesh.metadata || typeof mesh.metadata.health !== 'number') {
      console.warn(`Cannot create health bar for ${mesh.name}: no health metadata found`);
      return;
    }

    const maxHealth = mesh.metadata.health;
    const currentHealth = mesh.metadata.currentHealth ?? maxHealth;

    console.log(`🩺 Creating health bar for ${mesh.name}: ${currentHealth}/${maxHealth} HP`);

    // Create simple health bar display
    const healthBar = new SimpleHealthBar(this.scene, mesh, maxHealth, currentHealth);

    // Store reference
    this.healthBars.set(mesh.uniqueId.toString(), healthBar);
  }

  /**
   * Update all health bars (called every frame)
   */
  private updateHealthBars(): void {
    for (const healthBar of this.healthBars.values()) {
      healthBar.update();
    }
  }

  /**
   * Clean up all health bars
   */
  public dispose(): void {
    for (const healthBar of this.healthBars.values()) {
      healthBar.dispose();
    }
    this.healthBars.clear();
  }
}

class SimpleHealthBar {
  private mesh: AbstractMesh;
  private scene: Scene;
  private maxHealth: number;
  private currentHealth: number;

  private healthBarContainer!: Mesh;
  private healthBar!: Mesh;

  private healthBarMaterial!: StandardMaterial;
  private healthBarContainerMaterial!: StandardMaterial;

  constructor(scene: Scene, mesh: AbstractMesh, maxHealth: number, currentHealth: number) {
    this.scene = scene;
    this.mesh = mesh;
    this.maxHealth = maxHealth;
    this.currentHealth = currentHealth;

    this.createMaterials();
    this.createHealthBarMeshes();
    this.setupParenting();
    this.updateHealthDisplay();
  }

  private createMaterials(): void {
    // Green health bar material - use emissive color for consistent visibility
    this.healthBarMaterial = new StandardMaterial(`healthbar_mat_${this.mesh.name}`, this.scene);
    this.healthBarMaterial.emissiveColor = Color3.Green(); // Always visible regardless of lighting
    this.healthBarMaterial.diffuseColor = Color3.Green();
    this.healthBarMaterial.backFaceCulling = false;
    this.healthBarMaterial.disableLighting = true; // Ignore scene lighting

    // Dark gray container material - use emissive for visibility
    this.healthBarContainerMaterial = new StandardMaterial(`healthbar_container_mat_${this.mesh.name}`, this.scene);
    this.healthBarContainerMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2); // Dark gray background
    this.healthBarContainerMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    this.healthBarContainerMaterial.backFaceCulling = false;
    this.healthBarContainerMaterial.disableLighting = true; // Ignore scene lighting
  }

  private createHealthBarMeshes(): void {
    // Create health bar container (background)
    this.healthBarContainer = MeshBuilder.CreatePlane(
      `healthbar_container_${this.mesh.name}`,
      { width: 2, height: 0.5 },
      this.scene
    );

    // Create health bar (foreground)
    this.healthBar = MeshBuilder.CreatePlane(
      `healthbar_${this.mesh.name}`,
      { width: 2, height: 0.5 },
      this.scene
    );

    // Apply materials
    this.healthBarContainer.material = this.healthBarContainerMaterial;
    this.healthBar.material = this.healthBarMaterial;

    // Set billboard mode so health bar always faces camera
    this.healthBarContainer.billboardMode = Mesh.BILLBOARDMODE_ALL;

    // Set rendering groups to appear on top
    this.healthBar.renderingGroupId = 1;
    this.healthBarContainer.renderingGroupId = 1;
  }

  private setupParenting(): void {
    // Position health bar slightly in front of container to prevent flickering
    this.healthBar.position = new Vector3(0, 0, -0.01);

    // Position container above the mesh
    this.healthBarContainer.position = new Vector3(0, 1.5, 0);

    // Set up parent-child relationships
    this.healthBar.parent = this.healthBarContainer;
    this.healthBarContainer.parent = this.mesh;
  }

  public update(): void {
    if (!this.mesh || this.mesh.isDisposed()) return;

    this.updateHealthDisplay();
  }

  private updateHealthDisplay(): void {
    const healthPercentage = this.currentHealth / this.maxHealth;

    // Scale the health bar based on health percentage
    this.healthBar.scaling.x = healthPercentage;

    // Adjust position to keep health bar left-aligned as it shrinks
    this.healthBar.position.x = (1 - healthPercentage) * -1;

    // Change emissive color based on health percentage (always visible)
    if (healthPercentage > 0.5) {
      this.healthBarMaterial.emissiveColor = Color3.Green();
      this.healthBarMaterial.diffuseColor = Color3.Green();
    } else if (healthPercentage > 0.3) {
      this.healthBarMaterial.emissiveColor = Color3.Yellow();
      this.healthBarMaterial.diffuseColor = Color3.Yellow();
    } else {
      this.healthBarMaterial.emissiveColor = Color3.Red();
      this.healthBarMaterial.diffuseColor = Color3.Red();
    }
  }

  public dispose(): void {
    this.healthBarContainer?.dispose();
    this.healthBar?.dispose();
    this.healthBarMaterial?.dispose();
    this.healthBarContainerMaterial?.dispose();
  }
}
