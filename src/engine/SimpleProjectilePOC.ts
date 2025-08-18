import {
    Scene,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Ray,
    RayHelper,
    PickingInfo,
    PhysicsHelper,
    PhysicsRadialImpulseFalloff,
    AbstractMesh
} from '@babylonjs/core';

/**
 * Super simple POC projectile - just ray detection and explosion visualization
 * Based on what works in ExplosionTestScene
 */
export class SimpleProjectilePOC {
    private scene: Scene;
    private physicsHelper: PhysicsHelper;
    private mesh!: AbstractMesh;
    private ray!: Ray;
    private rayHelper!: RayHelper;
    private direction: Vector3;
    private speed: number = 20;
    private isActive: boolean = true;
    private lifetime: number = 5000; // 5 seconds max lifetime
    private startTime!: number;

    constructor(scene: Scene, startPosition: Vector3, direction: Vector3) {
        this.scene = scene;
        this.direction = direction.normalize();

        // Get PhysicsHelper from scene metadata (same as ExplosionTestScene)
        const sceneController = this.scene.metadata?.sceneController;
        this.physicsHelper = sceneController?.physicsHelper;

        if (!this.physicsHelper) {
            console.error("❌ No PhysicsHelper found - explosions won't work!");
            return;
        }

        // Create simple projectile visual
        this.mesh = MeshBuilder.CreateSphere("simplePOCProjectile", { diameter: 0.3 }, this.scene);
        this.mesh.position = startPosition.clone();

        // Make it red and glowing
        const material = new StandardMaterial("projectileMaterial", this.scene);
        material.diffuseColor = Color3.Red();
        material.emissiveColor = Color3.Red().scale(0.3);
        this.mesh.material = material;

        // Create ray for collision detection (same approach as BaseProjectile)
        this.ray = new Ray(this.mesh.position, this.direction);

        // Make ray visible for debugging
        this.rayHelper = new RayHelper(this.ray);
        this.rayHelper.show(this.scene, Color3.Yellow());

        // Record start time for lifetime management
        this.startTime = Date.now();

        console.log("🚀 Simple POC Projectile created:");
        console.log(`  - Position: ${startPosition.toString()}`);
        console.log(`  - Direction: ${direction.toString()}`);
        console.log(`  - Speed: ${this.speed}`);
        console.log("✅ PhysicsHelper available for explosions");
    }

    public update(deltaTime: number): void {
        if (!this.isActive) return;

        // Move projectile
        const movement = this.direction.scale(this.speed * deltaTime / 1000);
        this.mesh.position.addInPlace(movement);

        // Update ray position
        this.ray.origin = this.mesh.position.clone();
        this.ray.direction = this.direction;

        // Update ray visualization
        if (this.rayHelper) {
            this.rayHelper.dispose();
            this.rayHelper = new RayHelper(this.ray);
            this.rayHelper.show(this.scene, Color3.Yellow());
        }

        // Check for collision using ray
        this.checkCollision();
    }

    private checkCollision(): void {
        // Cast ray to detect collision (same as BaseProjectile approach)
        const rayLength = 1.0;
        const hit = this.scene.pickWithRay(this.ray, (mesh) => {
            // Only hit physics objects (boxes, ground, etc.)
            return mesh !== this.mesh && // Don't hit ourselves
                   !mesh.name.includes('camera') && // Don't hit camera
                   !mesh.name.includes('test') && // Don't hit test objects
                   mesh.name !== '__root__'; // Don't hit root
        }, false);

        if (hit && hit.hit && hit.pickedPoint && hit.pickedMesh) {
            console.log(`💥 POC Projectile HIT: ${hit.pickedMesh.name}`);
            console.log(`   Hit point: ${hit.pickedPoint.toString()}`);

            // Create explosion at hit point
            this.explode(hit.pickedPoint);
        }
    }

    private explode(explosionPoint: Vector3): void {
        if (!this.isActive) return;

        this.isActive = false;
        console.log("💥💥💥 POC EXPLOSION! 💥💥💥");
        console.log(`Explosion at: ${explosionPoint.toString()}`);

        // Use EXACT same explosion code as ExplosionTestScene
        try {
            const explosionEvent = this.physicsHelper.applyRadialExplosionImpulse(
                explosionPoint,
                5, // radius - same as ExplosionTestScene example
                30, // force - same as ExplosionTestScene example
                PhysicsRadialImpulseFalloff.Linear
            );

            if (explosionEvent) {
                console.log("✅ POC Explosion successful!");
                console.log(`  - Center: ${explosionPoint.toString()}`);
                console.log(`  - Radius: 5m`);
                console.log(`  - Force: 30N`);

                // Create visual explosion indicator (same as ExplosionTestScene)
                this.createExplosionVisual(explosionPoint, 5);

                // Cleanup explosion event
                setTimeout(() => {
                    explosionEvent.dispose();
                    console.log("🧹 POC Explosion event cleaned up");
                }, 100);
            } else {
                console.log("⚠️ POC Explosion event was null");
            }

        } catch (error) {
            console.error("❌ POC Explosion failed:", error);
        }

        // Remove projectile
        this.dispose();
    }

    private createExplosionVisual(center: Vector3, radius: number): void {
        // EXACT same visual as ExplosionTestScene
        const explosionSphere = MeshBuilder.CreateSphere(
            "pocExplosionIndicator",
            { diameter: radius * 2 },
            this.scene
        );
        explosionSphere.position = center;

        // Create explosion material
        const explosionMaterial = new StandardMaterial("pocExplosionMaterial", this.scene);
        explosionMaterial.emissiveColor = new Color3(1, 0.5, 0); // Orange glow
        explosionMaterial.alpha = 0.3;
        explosionSphere.material = explosionMaterial;

        // Animate and remove (same as ExplosionTestScene)
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

    public dispose(): void {
        console.log("🗑️ Disposing POC projectile");

        if (this.rayHelper) {
            this.rayHelper.dispose();
        }

        if (this.mesh) {
            this.mesh.dispose();
        }

        this.isActive = false;
    }

    public isDestroyed(): boolean {
        return !this.isActive;
    }
}
