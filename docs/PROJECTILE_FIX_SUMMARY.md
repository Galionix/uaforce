# Projectile System Fix for 2D Platformer

## Issue Identified
The original projectile system was incorrectly designed for a 3D first-person camera-based game, but the actual game is a 2D platformer where:
- Player can only move left and right (2D movement)
- Player has a facing direction based on Y rotation
- Player has a "nose" mesh that indicates facing direction
- Game uses Physics2DConstraintSystem to constrain movement to 2D plane

## Changes Made

### 1. ProjectileController.ts - Complete Redesign
**Before**: Used camera position and direction for firing
```typescript
const startPosition = this.camera.position.clone();
const direction = this.camera.getForwardRay().direction;
```

**After**: Uses player position and facing direction
```typescript
const playerPosition = this.playerController.getPosition();
const facingLeft = this.playerController.getFacingDirection();
const startPosition = new Vector3(
  playerPosition.x + (facingLeft ? 1.5 : -1.5),
  playerPosition.y + 0.5,
  0 // Always 0 for 2D
);
const direction = new Vector3(
  facingLeft ? 1 : -1,  // Left = +1, Right = -1
  0,                    // No vertical movement
  0                     // Always 0 for 2D
);
```

### 2. Player Direction Logic
**Player Facing Detection**:
- `rotation.y = 0` → Player faces RIGHT → Fire in negative X direction
- `rotation.y = π` → Player faces LEFT → Fire in positive X direction

**Forward Offset Calculation**:
- Projectile spawns 1.5 units in front of player
- Prevents collision with player mesh
- Maintains proper 2D positioning

### 3. SceneController.ts Integration
**Before**: Initialized with camera reference
```typescript
new ProjectileController(this._scene, this, this._cameraController.camera)
```

**After**: Initialized with player controller reference
```typescript
new ProjectileController(this._scene, this, this._playerController)
```

### 4. Projectile.ts - 2D Physics Integration
**Added**: Automatic registration with Physics2DConstraintSystem
```typescript
if (sceneController && sceneController.physics2DConstraintSystem) {
  sceneController.physics2DConstraintSystem.registerPhysicsBody(
    projectileAggregate.body,
    'Projectile'
  );
}
```

### 5. Documentation Updates
- Updated PROJECTILE_SYSTEM.md to reflect 2D platformer mechanics
- Added detailed technical documentation for player direction system
- Included position calculation examples
- Clarified coordinate system (X axis for left/right, Z always 0)

## Key Benefits of the Fix

### ✅ Proper 2D Integration
- Projectiles now respect 2D physics constraints
- Z position always locked to 0
- No unwanted 3D movement

### ✅ Player-Centric Firing
- Fires from player position, not camera
- Direction based on player's actual facing direction
- Visual consistency with player's nose indicator

### ✅ Accurate Direction Calculation
- Left/right movement matches player controls
- Proper coordinate system usage
- Consistent with game's 2D nature

### ✅ Console Feedback
- Clear logging of player position and facing direction
- Easy debugging of projectile spawn points
- Direction vector visualization in logs

## Testing the Fix

### Controls (Unchanged)
- **A/D**: Move player left/right (changes facing direction)
- **W**: Jump
- **Space** or **F1**: Fire projectile

### Expected Behavior
1. Player faces direction of last movement
2. Projectile fires from player position in facing direction
3. Projectile travels horizontally in 2D plane
4. Explosion occurs on collision with any mesh
5. GLB objects get proper coordinate fixes

### Console Output Examples
```
🚀 Firing projectile from player position: (5.2, 2.1, 0.0)
📍 Player facing: LEFT
📍 Projectile start: (6.7, 2.6, 0.0)
📍 Direction: (1.0, 0.0, 0.0)
```

## System Compatibility
- ✅ Works with existing ExplosionUtils
- ✅ Maintains GLB coordinate fix system
- ✅ Compatible with Physics2DConstraintSystem
- ✅ Preserves explosion effects and cleanup
- ✅ Rate limiting and projectile limits still active

The projectile system now correctly works as a 2D platformer weapon system! 🎯
