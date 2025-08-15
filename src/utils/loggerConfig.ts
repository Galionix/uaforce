import Logger, { LogCategory, LogLevel } from './logger';

// Development log configuration
// Change these values to enable/disable different logging categories during development
export const LOG_CONFIG = {
  // Game engine components
  PLAYER_MOVEMENT: LogLevel.SILENT,    // Currently disabled as requested
  CAMERA: LogLevel.SILENT,             // Currently disabled as requested
  PHYSICS: LogLevel.WARN,
  INPUT: LogLevel.WARN,

  // Content and systems
  LEVEL_LOADER: LogLevel.INFO,
  DIALOG: LogLevel.INFO,
  SOUND: LogLevel.INFO,
  RESOURCE: LogLevel.INFO,

  // General application
  GENERAL: LogLevel.WARN,
};

// Apply configuration
export function configureLogging(): void {
  Logger.setLevel(LogCategory.PLAYER_MOVEMENT, LOG_CONFIG.PLAYER_MOVEMENT);
  Logger.setLevel(LogCategory.CAMERA, LOG_CONFIG.CAMERA);
  Logger.setLevel(LogCategory.PHYSICS, LOG_CONFIG.PHYSICS);
  Logger.setLevel(LogCategory.INPUT, LOG_CONFIG.INPUT);
  Logger.setLevel(LogCategory.LEVEL_LOADER, LOG_CONFIG.LEVEL_LOADER);
  Logger.setLevel(LogCategory.DIALOG, LOG_CONFIG.DIALOG);
  Logger.setLevel(LogCategory.SOUND, LOG_CONFIG.SOUND);
  Logger.setLevel(LogCategory.RESOURCE, LOG_CONFIG.RESOURCE);
  Logger.setLevel(LogCategory.GENERAL, LOG_CONFIG.GENERAL);
}

// Utility functions for quick debugging
export const debugUtils = {
  // Enable player movement debugging
  enablePlayerDebug: () => {
    Logger.setLevel(LogCategory.PLAYER_MOVEMENT, LogLevel.DEBUG);
    console.log('Player movement debug logging enabled');
  },

  // Enable camera debugging
  enableCameraDebug: () => {
    Logger.setLevel(LogCategory.CAMERA, LogLevel.DEBUG);
    console.log('Camera debug logging enabled');
  },

  // Enable physics debugging
  enablePhysicsDebug: () => {
    Logger.setLevel(LogCategory.PHYSICS, LogLevel.DEBUG);
    console.log('Physics debug logging enabled');
  },

  // Disable all debugging
  disableAllDebug: () => {
    Logger.setLevel(LogCategory.PLAYER_MOVEMENT, LogLevel.SILENT);
    Logger.setLevel(LogCategory.CAMERA, LogLevel.SILENT);
    Logger.setLevel(LogCategory.PHYSICS, LogLevel.SILENT);
    Logger.setLevel(LogCategory.INPUT, LogLevel.SILENT);
    console.log('All debug logging disabled');
  },

  // Enable all debugging
  enableAllDebug: () => {
    Logger.setAllLevels(LogLevel.DEBUG);
    console.log('All debug logging enabled');
  }
};

// Expose debug utils to global window object for easy console access
if (typeof window !== 'undefined') {
  (window as any).loggerDebug = debugUtils;
}
