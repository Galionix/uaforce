import {
    Scene,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    HemisphericLight,
    PhysicsAggregate,
    PhysicsShapeType,
    PhysicsHelper,
    PhysicsRadialImpulseFalloff,
    PointerEventTypes,
    PickingInfo
} from '@babylonjs/core';

export class ExplosionTestScene {
    private scene: Scene;
    private physicsHelper: PhysicsHelper;
    private cubes: any[] = [];
    private testMeshes: any[] = []; // Track test-specific meshes

    constructor(scene: Scene) {
        this.scene = scene;
        this.physicsHelper = new PhysicsHelper(scene);
        this.setupTestScene();
        this.setupClickToExplode();
    }

    private restoreOriginalMeshes(): void {
        // Show all previously hidden meshes
        this.scene.meshes.forEach(mesh => {
            if (!mesh.name.includes('test')) {
                mesh.setEnabled(true);
            }
        });
    }

    private setupTestScene(): void {
        console.log("🧪 Setting up explosion test scene...");

        // Hide existing meshes instead of disposing them
        this.hideExistingMeshes();

        // Create lighting
        const light = new HemisphericLight("testLight", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // Create ground plane
        const ground = MeshBuilder.CreateGround("testGround", { width: 50, height: 50 }, this.scene);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.3); // Green
        ground.material = groundMaterial;

        // Track test meshes
        this.testMeshes.push(ground);

        // Add physics to ground (static)
        const groundAggregate = new PhysicsAggregate(
            ground,
            PhysicsShapeType.BOX,
            { mass: 0, restitution: 0.2 },
            this.scene
        );

        // Create a grid of test cubes
        this.createTestCubes();

        console.log("✅ Explosion test scene setup complete!");
        console.log("💡 Click anywhere to create an explosion at that location!");
    }

    private hideExistingMeshes(): void {
        // Store and hide existing meshes instead of disposing them
        this.scene.meshes.forEach(mesh => {
            if (!mesh.name.includes('camera') && !mesh.name.includes('test')) {
                mesh.setEnabled(false);
            }
        });
    }

    private createTestCubes(): void {
        console.log("📦 Creating test cubes...");

        const cubeSize = 1;
        const spacing = 3;
        const gridSize = 6; // 6x6 grid
        const startX = -(gridSize * spacing) / 2;
        const startZ = -(gridSize * spacing) / 2;

        // Clear existing cubes
        this.cubes.forEach(cube => cube.dispose());
        this.cubes = [];

        // Also clear from testMeshes tracking
        this.testMeshes = this.testMeshes.filter(mesh => {
            if (mesh.name && mesh.name.startsWith('testCube_')) {
                return false; // Remove from tracking, already disposed above
            }
            return true; // Keep other test meshes
        });

        // Create materials
        const materials = [
            this.createCubeMaterial("red", Color3.Red()),
            this.createCubeMaterial("blue", Color3.Blue()),
            this.createCubeMaterial("yellow", Color3.Yellow()),
            this.createCubeMaterial("purple", Color3.Purple()),
            this.createCubeMaterial("orange", new Color3(1, 0.5, 0))
        ];

        // Create grid of cubes
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const cube = MeshBuilder.CreateBox(
                    `testCube_${x}_${z}`,
                    { size: cubeSize },
                    this.scene
                );

                // Position cube
                cube.position = new Vector3(
                    startX + (x * spacing),
                    cubeSize / 2 + 0.1, // Slightly above ground
                    startZ + (z * spacing)
                );

                // Random material
                cube.material = materials[Math.floor(Math.random() * materials.length)];

                // Add physics (dynamic)
                const cubeAggregate = new PhysicsAggregate(
                    cube,
                    PhysicsShapeType.BOX,
                    {
                        mass: 1,
                        restitution: 0.3,
                        friction: 0.5
                    },
                    this.scene
                );

                this.cubes.push(cube);
                this.testMeshes.push(cube); // Track for disposal
            }
        }

        console.log(`✅ Created ${this.cubes.length} test cubes`);
    }

    private createCubeMaterial(name: string, color: Color3): StandardMaterial {
        const material = new StandardMaterial(`${name}Material`, this.scene);
        material.diffuseColor = color;
        material.specularColor = color.scale(0.5);
        return material;
    }

    private setupClickToExplode(): void {
        console.log("🖱️ Setting up click-to-explode functionality...");

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 0) { // Left click
                    this.handleMouseClick(pointerInfo.pickInfo);
                }
            }
        });

        console.log("✅ Click-to-explode setup complete!");
    }

    private handleMouseClick(pickInfo: PickingInfo | null): void {
        if (!pickInfo || !pickInfo.hit || !pickInfo.pickedPoint) {
            console.log("❌ No valid pick point found");
            return;
        }

        const explosionPoint = pickInfo.pickedPoint;
        console.log("🎯 Creating explosion at:", explosionPoint.toString());

        this.createExplosion(explosionPoint);
    }

    private createExplosion(center: Vector3): void {
        console.log("💥 BOOM! Creating explosion...");

        // Explosion parameters
        const explosionRadius = 8;
        const explosionStrength = 30;

        try {
            // Use PhysicsHelper for explosion
            const explosionEvent = this.physicsHelper.applyRadialExplosionImpulse(
                center,
                explosionRadius,
                explosionStrength,
                PhysicsRadialImpulseFalloff.Linear
            );

            if (explosionEvent) {
                console.log("💥 Explosion applied successfully!");
                console.log(`  - Center: ${center.toString()}`);
                console.log(`  - Radius: ${explosionRadius}`);
                console.log(`  - Strength: ${explosionStrength}`);
                console.log(`  - Event:`, explosionEvent);

                // Create visual explosion indicator
                this.createExplosionVisual(center, explosionRadius);

                // Get explosion data for debugging
                const eventData = explosionEvent.getData();
                console.log("📊 Explosion data:", eventData);

                // Cleanup after a short delay
                setTimeout(() => {
                    explosionEvent.dispose();
                    console.log("🧹 Explosion event cleaned up");
                }, 3000);
            } else {
                console.log("⚠️ Explosion event was null");
            }

        } catch (error) {
            console.error("❌ Error creating explosion:", error);
        }
    }

    private createExplosionVisual(center: Vector3, radius: number): void {
        // Create a temporary sphere to show explosion area
        const explosionSphere = MeshBuilder.CreateSphere(
            "explosionIndicator",
            { diameter: radius * 2 },
            this.scene
        );
        explosionSphere.position = center;

        // Create explosion material
        const explosionMaterial = new StandardMaterial("explosionMaterial", this.scene);
        explosionMaterial.emissiveColor = new Color3(1, 0.5, 0); // Orange glow
        explosionMaterial.alpha = 0.3;
        explosionSphere.material = explosionMaterial;

        // Animate and remove
        let alpha = 0.3;
        const fadeInterval = setInterval(() => {
            alpha -= 0.05;
            explosionMaterial.alpha = alpha;

            if (alpha <= 0) {
                clearInterval(fadeInterval);
                explosionSphere.dispose();
            }
        }, 50);
    }

    public resetScene(): void {
        console.log("🔄 Resetting test scene...");
        this.createTestCubes();
        console.log("✅ Test scene reset complete!");
    }

    public dispose(): void {
        console.log("🗑️ Disposing explosion test scene...");

        // Remove only test-specific meshes
        this.testMeshes.forEach(mesh => {
            if (mesh && !mesh.isDisposed()) {
                mesh.dispose();
            }
        });
        this.testMeshes = [];
        this.cubes = [];

        // Restore original meshes
        this.restoreOriginalMeshes();

        console.log("✅ Test scene disposed and original scene restored");
    }

    // Adjust explosion parameters for testing
    public testExplosion(center: Vector3, radius: number = 8, strength: number = 30): void {
        console.log(`🧪 Testing explosion with radius=${radius}, strength=${strength}`);

        try {
            const explosionEvent = this.physicsHelper.applyRadialExplosionImpulse(
                center,
                radius,
                strength,
                PhysicsRadialImpulseFalloff.Linear
            );

            if (explosionEvent) {
                this.createExplosionVisual(center, radius);

                setTimeout(() => {
                    explosionEvent.dispose();
                }, 1000);
            } else {
                console.log("⚠️ Test explosion event was null");
            }

        } catch (error) {
            console.error("❌ Test explosion failed:", error);
        }
    }
}
