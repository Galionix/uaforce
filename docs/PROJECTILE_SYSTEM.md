# Projectile System Documentation

## Overview
The projectile system provides a clean and efficient way for the 2D platformer player to fire projectiles that create explosions on collision. Projectiles are fired from the player's position in the direction the player is currently facing. The system integrates seamlessly with the existing GLB coordinate fix system through the `ExplosionUtils` class and respects the 2D physics constraints.

## Components

### 1. Projectile Class (`Projectile.ts`)
- **Purpose**: Individual projectile entity with physics and collision detection
- **Key Features**:
  - Physics-enabled sphere mesh with glowing material
  - Ray-based collision detection
  - Automatic explosion on collision or timeout
  - GLB coordinate fix integration
  - 2D physics constraint registration
  - Configurable speed, size, colors, and explosion parameters

### 2. ProjectileController Class (`ProjectileController.ts`)
- **Purpose**: Manages multiple projectiles and firing mechanics for the 2D player
- **Key Features**:
  - Fires projectiles from player position in player's facing direction
  - Calculates proper 2D direction vectors (left/right only)
  - Limits maximum active projectiles (default: 10)
  - Automatic cleanup of destroyed projectiles
  - Rate limiting to prevent spam

### 3. Integration Points
- **SceneController**: Initializes ProjectileController with player controller reference
- **InputController**: Handles firing input (Space key and F1 key)
- **ExplosionUtils**: Handles explosion creation with GLB fixes
- **PlayerController**: Provides position and facing direction for projectiles
- **Physics2DConstraintSystem**: Constrains projectiles to 2D plane (Z=0)

## Controls

### Keyboard Controls
- **Space**: Fire projectile (continuous fire with rate limiting)
- **F1**: Alternative fire key
- Rate limit: 300ms between shots

### Firing Mechanics
- Projectiles fire from player's position (with small forward offset)
- Direction based on player's facing direction (left/right)
- Visual and console feedback for successful/failed shots
- Player facing direction determined by rotation.y (0 = right, π = left)

## Configuration

### Projectile Configuration (`ProjectileConfig`)
```typescript
interface ProjectileConfig {
  speed?: number;           // Default: 50
  explosionRadius?: number; // Default: 6
  explosionStrength?: number; // Default: 25
  lifeTime?: number;        // Default: 5000ms
  size?: number;            // Default: 0.2
  color?: Color3;           // Default: Orange
}
```

### System Limits
- **Max Active Projectiles**: 10 (configurable)
- **Fire Rate**: 300ms between shots
- **Projectile Lifetime**: 5 seconds
- **Physics**: Low mass (0.1), gravity disabled for straight trajectories

## Technical Details

### 2D Platformer Integration
- **Player Position**: Projectiles spawn from player's world position
- **Facing Direction**: Uses player's Y rotation to determine left/right direction
  - `rotation.y = 0` → Player faces RIGHT → Projectile fires in negative X direction
  - `rotation.y = π` → Player faces LEFT → Projectile fires in positive X direction
- **2D Constraints**: Projectiles automatically registered with Physics2DConstraintSystem
- **Forward Offset**: 1.5 units in front of player to avoid self-collision

### Player Direction System
```typescript
// Player facing determination
const facingLeft = Math.abs(playerMesh.rotation.y - Math.PI) < 0.1;

// Direction vector calculation
const direction = new Vector3(
  facingLeft ? 1 : -1,  // X: +1 for left, -1 for right
  0,                    // Y: No vertical movement
  0                     // Z: Always 0 for 2D
);
```

### Position Calculation
```typescript
// Projectile spawn position
const playerPosition = playerController.getPosition();
const forwardOffset = facingLeft ? 1.5 : -1.5;
const startPosition = new Vector3(
  playerPosition.x + forwardOffset,
  playerPosition.y + 0.5,  // Slightly above player center
  0                        // Z locked to 0
);
```

### Collision Detection
- Uses Babylon.js Ray casting for precise collision detection
- Ray length calculated based on projectile speed and framerate
- Filters out projectile mesh from collision checks
- Supports collision with any mesh in the scene

### Explosion System
- Integrates with `ExplosionUtils.createExplosion()`
- Automatic GLB coordinate system detection and correction
- Passes hit mesh for direct hit optimizations
- Explosion cleanup after 3 seconds

### Performance Optimizations
- Projectiles automatically destroy themselves on collision or timeout
- Physics bodies are lightweight (mass: 0.1)
- Rate limiting prevents spam and performance issues
- Automatic cleanup of inactive projectiles

## Usage Examples

### Basic Firing
```typescript
// Fire a projectile with default settings
const projectile = sceneController.projectileController.fireProjectile();
```

### Custom Projectile
```typescript
// Fire a fast, large projectile with big explosion
const projectile = sceneController.projectileController.fireProjectile({
  speed: 100,
  size: 0.5,
  explosionRadius: 10,
  explosionStrength: 50,
  color: new Color3(0, 1, 0) // Green
});
```

### Manual Cleanup
```typescript
// Destroy all active projectiles (useful for scene resets)
sceneController.projectileController.destroyAllProjectiles();
```

## Integration with GLB Objects

The projectile system automatically handles GLB coordinate system mismatches:

1. **Direct Hits**: When hitting a GLB object, uses mesh position for explosion center
2. **Ground Explosions**: Automatically detects and corrects coordinate system issues
3. **GLB Detection**: Uses metadata flags (`health`, `mass`) to identify GLB objects
4. **Coordinate Testing**: Tests original vs inverted X coordinates for optimal placement

## Console Output

The system provides detailed console feedback:
- 🚀 Projectile fired successfully
- 💥 Projectile explosion at: [position]
- 🎯 Hit mesh: "[mesh name]"
- ⚠️ Could not fire projectile (max limit reached)
- 🧹 Cleaned up projectile. Active count: [number]

## Future Enhancements

Potential improvements for the projectile system:
1. **Projectile Types**: Different projectile meshes and behaviors
2. **Particle Effects**: Trail effects and explosion particles
3. **Sound Effects**: Firing and explosion sounds
4. **Damage System**: Integration with health/damage mechanics
5. **Ballistic Trajectories**: Enable gravity for realistic arcing
6. **Ricochet**: Bouncing projectiles off certain surfaces
7. **Projectile Pooling**: Object pooling for better performance
