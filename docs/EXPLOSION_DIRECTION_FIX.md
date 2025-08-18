# Explosion Direction Fix

## Problem Identified
Boxes were being attracted **towards** the player when shot, instead of being pushed **away** from the explosion. This created an unrealistic "magnetic" effect that broke the physics immersion.

## Root Cause
The issue was in `ExplosionUtils.getOptimalExplosionCenter()` method, which was designed to handle coordinate system mismatches in GLB files. The method would sometimes invert the X coordinate of the explosion center, placing the explosion on the **opposite side** of where the projectile actually hit.

### What Was Happening:
1. Projectile hits box at position `(10, 5, 0)`
2. `getOptimalExplosionCenter()` inverts X coordinate
3. Explosion occurs at `(-10, 5.5, 0)` (behind/opposite side)
4. Explosion **pulls** objects toward the explosion center
5. Box moves toward player instead of away

## Solution Implemented

### ✅ **Simplified Explosion Center Calculation**
```typescript
// OLD: Complex coordinate system testing
explosionCenter = this.getOptimalExplosionCenter(center, allMeshes);

// NEW: Direct hit point usage
explosionCenter = center.clone();
explosionCenter.y += 0.2; // Small offset above surface
explosionCenter.z = 0;    // Ensure 2D positioning
```

### ✅ **Removed Coordinate Inversion Logic**
- Eliminated `getOptimalExplosionCenter()` method entirely
- No more X-coordinate inversion that caused "magnetic" effects
- Explosions now occur exactly where projectiles hit

### ✅ **Enhanced GLB Detection**
```typescript
static isGLBObject(mesh: any): boolean {
  return mesh.metadata &&
    (mesh.metadata.health !== undefined ||
     mesh.metadata.mass !== undefined ||
     mesh.metadata.isGLBBox);
}
```

## Technical Details

### Why This Fix Works:
1. **Direct Hit Points**: Explosions occur exactly where projectiles collide
2. **Proper Push Direction**: Objects are pushed **away** from actual collision point
3. **2D Positioning**: All explosions locked to Z=0 for consistent 2D behavior
4. **No Coordinate Fighting**: Removed complex coordinate system correction

### Previous vs. New Behavior:

**Before (Problematic):**
```
Projectile hits box at (10, 5, 0)
↓
Coordinate system test
↓
Explosion created at (-10, 5.5, 0)  // Opposite side!
↓
Box pulled toward explosion (toward player)
```

**After (Fixed):**
```
Projectile hits box at (10, 5, 0)
↓
Explosion created at (10, 5.2, 0)   // Exactly at hit point
↓
Box pushed away from explosion (away from player)
```

## Benefits

### ✅ **Realistic Physics**
- Objects move away from explosions as expected
- No more "magnetic" attraction effects
- Consistent with real-world explosion behavior

### ✅ **Better Gameplay**
- Players can push objects away by shooting them
- Predictable physics responses
- More satisfying explosion effects

### ✅ **Simplified Code**
- Removed complex coordinate system detection
- Cleaner, more maintainable explosion logic
- Fewer edge cases and potential bugs

### ✅ **2D Optimization**
- All explosions properly constrained to 2D plane
- Works seamlessly with Physics2DConstraintSystem
- Consistent with normalized Z=0 positioning

## Result
Boxes now behave correctly when shot:
- ✅ **Push away** from player when hit
- ✅ **Realistic explosion physics**
- ✅ **Predictable movement patterns**
- ✅ **No more magnetic attraction**

The projectile system now works exactly as expected for 2D gameplay! 🎯💥➡️
