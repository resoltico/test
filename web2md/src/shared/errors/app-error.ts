/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Configuration error
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
  }
}

/**
 * Rule loading error
 */
export class RuleError extends AppError {
  constructor(message: string) {
    super(`Rule error: ${message}`);
  }
}

/**
 * Input/Output error
 */
export class IOError extends AppError {
  constructor(message: string) {
    super(`I/O error: ${message}`);
  }
}

/**
 * Conversion error
 */
export class ConversionError extends AppError {
  constructor(message: string) {
    super(`Conversion error: ${message}`);
  }
}
