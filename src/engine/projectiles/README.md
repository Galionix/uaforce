# Projectile Management System

A comprehensive, performance-optimized projectile system for Babylon.js games with customizable effects and behaviors.

## Features

- **Performance Optimized**: Object pooling concepts, efficient updates, automatic culling
- **Highly Customizable**: Size, speed, physics, visual effects, damage, splash effects
- **Multiple Projectile Types**: Bullets, rockets, grenades, magic spells, arrows, and more
- **Advanced Behaviors**: Homing, piercing, bouncing, gravity effects
- **Visual Effects**: Particle systems, glow effects, trails, animations
- **Collision Detection**: Physics-based with custom target filtering
- **Splash Damage**: Area-of-effect damage with distance-based falloff
- **Easy Integration**: Drop-in system with minimal setup required

## Quick Start

### 1. Basic Setup

```typescript
import { ProjectileGameIntegration } from './engine/projectiles';

// In your Game class
export class Game {
    private projectileSystem: ProjectileGameIntegration;

    async init() {
        // After scene creation
        this.projectileSystem = new ProjectileGameIntegration(this.scene);
    }

    private gameLoop() {
        // In your main game loop
        this.projectileSystem.update();
    }
}
```

### 2. Basic Usage

```typescript
// Player shoots a bullet
this.projectileSystem.playerShoot(
    playerMesh,
    targetPosition,
    'bullet'
);

// Enemy shoots at player
this.projectileSystem.enemyShoot(
    enemyMesh,
    playerMesh,
    'bullet'
);

// Throw a grenade
this.projectileSystem.throwGrenade(
    fromPosition,
    targetPosition
);

// Cast a fireball spell
this.projectileSystem.castSpell(
    casterMesh,
    'fireball',
    targetPosition
);
```

## Available Projectile Types

### Built-in Types

- **`bullet`** - Fast, accurate, minimal effects
- **`rocket`** - Slower with splash damage and trail effects
- **`grenade`** - Arcs with gravity, timed explosion, large splash radius
- **`plasma`** - Energy projectile with piercing and glow effects
- **`arrow`** - Medieval style with gravity and realistic physics
- **`fireball`** - Magic spell with fire effects and splash damage
- **`ice_shard`** - Cold damage with slowing effect

### Custom Configuration

```typescript
// Fire a custom bullet with specific properties
this.projectileSystem.fireProjectile('bullet', {
    position: startPosition,
    direction: aimDirection,
    speed: 100,
    damage: 50,
    size: 0.1,
    color: Color3.Red(),
    lifetime: 3000,
    onHit: (target, hitPoint) => {
        console.log('Hit!', target.name);
    }
});
```

## Advanced Features

### Homing Projectiles

```typescript
this.projectileSystem.fireHomingMissile(fromMesh, targetMesh);

// Or custom homing
this.projectileSystem.fireProjectile('rocket', {
    position: fromPosition,
    direction: initialDirection,
    homing: {
        target: targetMesh,
        strength: 5.0
    }
});
```

### Shotgun Spread

```typescript
this.projectileSystem.fireShotgun(playerMesh, aimDirection);

// Or custom spread
this.projectileSystem.fireProjectileSpread(
    'bullet',
    startPosition,
    direction,
    8, // pellet count
    Math.PI / 6, // spread angle
    { damage: 15, size: 0.03 }
);
```

### Splash Damage

```typescript
this.projectileSystem.fireProjectile('rocket', {
    position: startPosition,
    direction: aimDirection,
    splashRadius: 5,
    splashDamage: 30,
    onSplash: (center, radius) => {
        // Return meshes that should be affected
        return this.findEnemiesInRadius(center, radius);
    }
});
```

## Creating Custom Projectile Types

### 1. Create Custom Projectile Class

```typescript
import { BaseProjectile, ProjectileConfig } from './engine/projectiles';

export class LaserProjectile extends BaseProjectile {
    constructor(scene: Scene, config: ProjectileConfig) {
        const laserConfig: ProjectileConfig = {
            ...config,
            size: 0.05,
            speed: 100,
            lifetime: 1000,
            color: Color3.Blue(),
            hasPhysics: false, // Instant hit
            glowEffect: true,
            trailEffect: true,
            piercing: true
        };

        super(scene, laserConfig);
    }

    protected updateCustomBehavior(deltaTime: number): void {
        // Custom laser behavior
        if (!this.config.hasPhysics) {
            // Move without physics
            const movement = this.velocity.scale(deltaTime);
            this.mesh.position.addInPlace(movement);
        }
    }
}
```

### 2. Register Custom Type

```typescript
// In your game initialization
this.projectileSystem.registerProjectileType('laser',
    (scene, config) => new LaserProjectile(scene, config));

// Use it
this.projectileSystem.fireProjectile('laser', {
    position: startPos,
    direction: aimDir
});
```

## Integration with Game Systems

### Damage System Integration

```typescript
// In ProjectileGameIntegration
private handlePlayerHit(target: AbstractMesh, hitPoint: Vector3, weaponType: string): void {
    // Apply damage
    const damage = this.getWeaponDamage(weaponType);
    this.gameManager.damageSystem.applyDamage(target, damage);

    // Create hit effects
    this.effectsManager.createHitEffect(hitPoint, weaponType);

    // Play sound
    this.soundManager.playHitSound(weaponType);
}
```

### Sound System Integration

```typescript
// Add to your projectile hit handlers
onHit: (target, hitPoint) => {
    this.soundController.playRandomSound(['hit1', 'hit2', 'hit3']);
}
```

### Effect System Integration

```typescript
// Custom explosion effect
private createExplosion(position: Vector3, intensity: number): void {
    // Particle effects
    this.particleManager.createExplosion(position, intensity);

    // Screen shake
    this.cameraController.addScreenShake(intensity * 0.5);

    // Sound
    this.soundController.playExplosion(intensity);
}
```

## Performance Configuration

```typescript
// Adjust performance settings
this.projectileSystem.maxProjectiles = 150; // Max active projectiles
this.projectileSystem.cullDistance = 100;   // Auto-remove distant projectiles

// Debug mode for development
this.projectileSystem.enableDebugMode();
```

## Metadata System for Targets

Set up your game objects with metadata for proper targeting:

```typescript
// Player mesh
playerMesh.metadata = {
    isPlayer: true,
    health: 100,
    maxHealth: 100
};

// Enemy mesh
enemyMesh.metadata = {
    isEnemy: true,
    health: 50,
    maxHealth: 50
};

// Environment objects
wallMesh.metadata = {
    isEnvironment: true,
    destructible: false
};
```

## Event Callbacks

The system provides several callback hooks:

```typescript
const projectile = this.projectileSystem.fireProjectile('bullet', {
    // ... config
    onHit: (target, hitPoint) => {
        // Called when projectile hits something
    },
    onExpire: (position) => {
        // Called when projectile lifetime expires
    },
    onSplash: (center, radius) => {
        // Called for splash damage calculation
        return this.findTargetsInRadius(center, radius);
    }
});
```

## Status Effects

The system includes examples of status effects:

### Burn Effect (Fireball)
- Applies damage over time
- Visual fire effects
- 5-second duration

### Slow Effect (Ice Shard)
- Reduces movement speed
- 3-second duration
- 50% speed reduction

### Custom Effects
```typescript
// In your hit handler
private applyCustomEffect(target: AbstractMesh): void {
    if (!target.metadata) target.metadata = {};

    target.metadata.poisonEffect = {
        duration: 10000,
        damagePerSecond: 2,
        appliedAt: Date.now()
    };
}
```

## Best Practices

1. **Performance**: Limit active projectiles and use appropriate cull distances
2. **Memory**: Clean up projectiles properly to avoid memory leaks
3. **Physics**: Use physics for realistic projectiles, disable for instant-hit weapons
4. **Effects**: Balance visual effects with performance requirements
5. **Collision**: Use appropriate target filtering to avoid unnecessary collision checks
6. **Sound**: Integrate with your sound system for better feedback
7. **Testing**: Use debug mode during development to visualize projectile paths

## Troubleshooting

### Common Issues

**Projectiles not visible:**
- Check if mesh is being created properly
- Verify material and color settings
- Ensure proper lighting in scene

**Poor performance:**
- Reduce max projectiles limit
- Increase cull distance for auto-cleanup
- Disable unnecessary visual effects

**Collision not working:**
- Verify target metadata is set correctly
- Check physics aggregate setup
- Ensure collision detection is enabled

**Effects not showing:**
- Check if effects are enabled in config
- Verify particle system setup
- Ensure proper disposal of effect resources

## API Reference

See the TypeScript interfaces and classes for complete API documentation:
- `BaseProjectile` - Base projectile class
- `ProjectileConfig` - Configuration interface
- `ProjectileManager` - Core management system
- `ProjectileGameIntegration` - High-level game integration class
