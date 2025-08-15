import log from 'loglevel';

// Configure log levels - can be controlled via environment or config
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SILENT = 'silent'
}

// Logger categories for different parts of the application
export enum LogCategory {
  PLAYER_MOVEMENT = 'player-movement',
  CAMERA = 'camera',
  PHYSICS = 'physics',
  INPUT = 'input',
  LEVEL_LOADER = 'level-loader',
  DIALOG = 'dialog',
  SOUND = 'sound',
  RESOURCE = 'resource',
  GENERAL = 'general'
}

// Create separate loggers for different categories
const loggers = new Map<LogCategory, log.Logger>();

// Initialize loggers with default levels
function initializeLogger(category: LogCategory, level: LogLevel = LogLevel.WARN): log.Logger {
  const logger = log.getLogger(category);
  logger.setLevel(level as any);
  return logger;
}

// Initialize all category loggers
Object.values(LogCategory).forEach(category => {
  // Set camera and player movement to SILENT by default as requested
  const defaultLevel = (category === LogCategory.CAMERA || category === LogCategory.PLAYER_MOVEMENT)
    ? LogLevel.SILENT
    : LogLevel.WARN;

  loggers.set(category, initializeLogger(category, defaultLevel));
});

// Main logger interface
export class Logger {
  private static getLogger(category: LogCategory): log.Logger {
    const logger = loggers.get(category);
    if (!logger) {
      throw new Error(`Logger for category ${category} not found`);
    }
    return logger;
  }

  // Player movement logging methods
  static playerMovement = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PLAYER_MOVEMENT).debug(`[${Date.now()}] ${message}`, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PLAYER_MOVEMENT).info(`[${Date.now()}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PLAYER_MOVEMENT).warn(`[${Date.now()}] ${message}`, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PLAYER_MOVEMENT).error(`[${Date.now()}] ${message}`, ...args)
  };

  // Camera logging methods
  static camera = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.CAMERA).debug(`[${Date.now()}] ${message}`, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.CAMERA).info(`[${Date.now()}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.CAMERA).warn(`[${Date.now()}] ${message}`, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.CAMERA).error(`[${Date.now()}] ${message}`, ...args)
  };

  // Physics logging methods
  static physics = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PHYSICS).debug(`[${Date.now()}] ${message}`, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PHYSICS).info(`[${Date.now()}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PHYSICS).warn(`[${Date.now()}] ${message}`, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.PHYSICS).error(`[${Date.now()}] ${message}`, ...args)
  };

  // Input logging methods
  static input = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.INPUT).debug(`[${Date.now()}] ${message}`, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.INPUT).info(`[${Date.now()}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.INPUT).warn(`[${Date.now()}] ${message}`, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.INPUT).error(`[${Date.now()}] ${message}`, ...args)
  };

  // Level loader logging methods
  static levelLoader = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.LEVEL_LOADER).debug(message, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.LEVEL_LOADER).info(message, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.LEVEL_LOADER).warn(message, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.LEVEL_LOADER).error(message, ...args)
  };

  // Dialog logging methods
  static dialog = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.DIALOG).debug(message, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.DIALOG).info(message, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.DIALOG).warn(message, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.DIALOG).error(message, ...args)
  };

  // Sound logging methods
  static sound = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.SOUND).debug(message, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.SOUND).info(message, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.SOUND).warn(message, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.SOUND).error(message, ...args)
  };

  // Resource logging methods
  static resource = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.RESOURCE).debug(message, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.RESOURCE).info(message, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.RESOURCE).warn(message, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.RESOURCE).error(message, ...args)
  };

  // General logging methods
  static general = {
    debug: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.GENERAL).debug(message, ...args),
    info: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.GENERAL).info(message, ...args),
    warn: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.GENERAL).warn(message, ...args),
    error: (message: string, ...args: any[]) =>
      Logger.getLogger(LogCategory.GENERAL).error(message, ...args)
  };

  // Utility methods to change log levels at runtime
  static setLevel(category: LogCategory, level: LogLevel): void {
    const logger = Logger.getLogger(category);
    logger.setLevel(level as any);
  }

  static setAllLevels(level: LogLevel): void {
    Object.values(LogCategory).forEach(category => {
      Logger.setLevel(category, level);
    });
  }

  // Enable/disable specific categories
  static enableCategory(category: LogCategory, level: LogLevel = LogLevel.DEBUG): void {
    Logger.setLevel(category, level);
  }

  static disableCategory(category: LogCategory): void {
    Logger.setLevel(category, LogLevel.SILENT);
  }
}

// Export for easy access
export default Logger;
