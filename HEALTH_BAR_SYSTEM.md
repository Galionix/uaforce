# Health Bar System Documentation

## Overview

The Health Bar System provides visual health indicators for destructible entities in the 2D platformer game. Health bars appear above entities with health metadata and update dynamically as they take damage from explosions.

## Features

### Visual Health Indicators
- **Health bars**: Display above entities with health metadata
- **Color coding**:
  - Green (healthy): >60% health
  - Yellow (damaged): 30-60% health
  - Red (critical): <30% health
- **Billboard effect**: Health bars always face the camera
- **Automatic sizing**: Health bar width scales with remaining health percentage

### Health Management
- **Damage system**: Explosions automatically damage entities within radius
- **Distance-based damage**: Closer entities take more damage (20-100% of base damage)
- **Entity destruction**: Entities are destroyed when health reaches 0
- **Automatic cleanup**: Health bars are removed when entities die

## Implementation Details

### Core Components

#### HealthBarSystem Class
- **Location**: `src/engine/HealthBarSystem.ts`
- **Purpose**: Manages all health bars in the scene
- **Update frequency**: Every frame via `scene.onBeforeRenderObservable`

#### HealthBarDisplay Class
- **Components**:
  - Border mesh (white outline)
  - Background mesh (dark background)
  - Health mesh (colored health indicator)
- **Positioning**: Always at Z=0 for 2D gameplay with configurable Y offset

### Integration Points

#### SceneController Integration
```typescript
// Health bar system initialization in asyncInit()
this._healthBarSystem = new HealthBarSystem(this._scene, {
  width: 2.0,
  height: 0.3,
  yOffset: 1.5
});

// Access via getter
get healthBarSystem() {
  return this._healthBarSystem;
}
```

#### MeshProcessor Integration
```typescript
// Health bars created for GLB boxes with health metadata
if (this._sceneController.healthBarSystem && mesh.metadata.health) {
  this._sceneController.healthBarSystem.createHealthBar(mesh);
}
```

#### ExplosionUtils Integration
```typescript
// Automatic damage application in explosion radius
private static applyExplosionDamage(
  explosionCenter: Vector3,
  radius: number,
  baseDamage: number,
  allMeshes: any[],
  sceneController: SceneController
)
```

### Configuration Options

#### HealthBarConfig Interface
```typescript
interface HealthBarConfig {
  width?: number;           // Default: 2.0
  height?: number;          // Default: 0.3
  yOffset?: number;         // Default: 1.5
  backgroundColor?: Color3; // Default: dark gray
  healthColor?: Color3;     // Default: green
  damageColor?: Color3;     // Default: red
  borderColor?: Color3;     // Default: white
}
```

## Usage Examples

### Creating Health Bars
```typescript
// Automatic creation for entities with health metadata
const boxProperties = {
  health: 50,  // CRITICAL: Required for health bar creation
  mass: 1,
  currentHealth: 50  // Set initially equal to max health
};

mesh.metadata = {
  ...boxProperties,
  isGLBBox: true,
  sourceType: 'GLB_LEVEL_FILE'
};

// Health bar automatically created by MeshProcessor
```

### Manual Health Management
```typescript
// Damage an entity
const isDead = healthBarSystem.damageEntity(mesh, 15);

// Update health directly
healthBarSystem.updateHealth(mesh, newHealthValue);

// Remove health bar
healthBarSystem.removeHealthBar(mesh);
```

### Explosion Damage
```typescript
// Explosions automatically damage entities in radius
ExplosionUtils.createExplosion(
  physicsHelper,
  explosionCenter,
  radius,          // Damage radius
  strength,        // Physics impulse strength
  allMeshes,       // Scene meshes to check
  hitMesh,         // Direct hit target
  sceneController, // For health management
  20               // Base damage amount
);
```

## Rendering Details

### Rendering Groups
- **Group ID**: 1 (renders after main geometry)
- **Components**: Border, background, and health meshes all use same group
- **Purpose**: Ensures health bars render on top of game objects

### Z-Position Management
- **Constraint**: All health bar components at Z=0 for 2D gameplay
- **Billboard**: Health bars rotate to face camera while maintaining 2D constraint
- **Positioning**: Dynamic Y-offset based on entity position

## Performance Considerations

### Update Optimization
- **Frequency**: Position updates every frame for active health bars only
- **Culling**: Health bars hidden when entity health reaches 0
- **Cleanup**: Automatic disposal when entities are destroyed

### Memory Management
- **References**: Weak references to prevent memory leaks
- **Disposal**: Proper cleanup of Babylon.js meshes and materials
- **Mapping**: Efficient uniqueId-based health bar tracking

## Debugging

### Console Logging
```
🩺 Creating health bar for box_01: 50/50 HP
❤️ Updated health for box_01: 35/50 HP
💥 box_01 took 15 damage. Health: 35/50
🎯 box_01 is 2.34 units from explosion (0.61x damage)
💀 box_01 destroyed by explosion!
🗑️ Removed health bar for box_01
```

### Health Bar Count
```typescript
const count = healthBarSystem.getHealthBarCount();
console.log(`Active health bars: ${count}`);
```

## Troubleshooting

### Common Issues

1. **Health bars not appearing**
   - Check: Entity has `health` property in metadata
   - Check: HealthBarSystem is initialized in SceneController
   - Check: Entity position is valid (not NaN)

2. **Health bars not updating**
   - Check: Health values are numbers, not strings
   - Check: updateHealth called with valid values
   - Check: Entity still exists and isn't disposed

3. **Performance issues**
   - Check: Health bar count isn't excessive (>50)
   - Check: Proper disposal when entities are destroyed
   - Consider reducing update frequency for distant entities

## Future Enhancements

### Potential Improvements
- **LOD system**: Reduce health bar detail at distance
- **Animation effects**: Damage indicators, health regeneration
- **Status effects**: Poison, fire, etc. with color overlays
- **Numeric display**: Show exact health numbers
- **Armor indicators**: Shield bars for protected entities
