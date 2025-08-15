// Main exports for the projectile system
export { BaseProjectile } from './BaseProjectile';
export type { ProjectileConfig } from './BaseProjectile';
export { ProjectileManager } from './ProjectileManager';
export { ProjectileGameIntegration } from './ProjectileGameIntegration';

// Specific projectile types
export {
    BulletProjectile,
    RocketProjectile,
    GrenadeProjectile,
    PlasmaProjectile,
    ArrowProjectile,
    FireballProjectile,
    IceShardProjectile,
    TimedBombProjectile
} from './ProjectileTypes';

// Re-export for convenience
export * from './ProjectileManager';
export * from './ProjectileGameIntegration';
export * from './ProjectileTypes';
