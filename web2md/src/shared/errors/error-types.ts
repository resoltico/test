/**
 * Specific error types for different error cases
 */
import { AppError } from './app-error.js';

/**
 * Error thrown when configuration is invalid
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

/**
 * Error thrown when a file operation fails
 */
export class FileError extends AppError {
  constructor(message: string, public path?: string) {
    super(message, 'FILE_ERROR');
  }
}

/**
 * Error thrown when a network request fails
 */
export class NetworkError extends AppError {
  constructor(message: string, public url?: string) {
    super(message, 'NETWORK_ERROR');
  }
}

/**
 * Error thrown when a conversion operation fails
 */
export class ConversionError extends AppError {
  constructor(message: string) {
    super(message, 'CONVERSION_ERROR');
  }
}

/**
 * Error thrown when a rule is invalid or cannot be loaded
 */
export class RuleError extends AppError {
  constructor(message: string, public ruleName?: string) {
    super(message, 'RULE_ERROR');
  }
}

/**
 * Error thrown when command-line arguments are invalid
 */
export class CliError extends AppError {
  constructor(message: string) {
    super(message, 'CLI_ERROR');
  }
}
