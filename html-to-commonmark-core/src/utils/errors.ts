/**
 * Custom error classes for html-to-commonmark-core
 */

/**
 * Base error class for all conversion errors
 */
export class ConversionError extends Error {
  /**
   * Original cause of the error
   */
  cause?: Error;

  /**
   * Creates a new ConversionError
   * @param message Error message
   * @param options Additional options
   */
  constructor(message: string, options?: { cause?: Error }) {
    super(message);
    this.name = 'ConversionError';
    
    if (options?.cause) {
      this.cause = options.cause;
    }
    
    // Ensure proper prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, ConversionError.prototype);
  }
}

/**
 * Error thrown when parsing HTML fails
 */
export class ParseError extends ConversionError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'ParseError';
    
    // Ensure proper prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

/**
 * Error thrown when a rule cannot be applied
 */
export class RuleError extends ConversionError {
  /**
   * Tag name that caused the error
   */
  tagName?: string;

  constructor(message: string, options?: { cause?: Error; tagName?: string }) {
    super(message, options);
    this.name = 'RuleError';
    this.tagName = options?.tagName;
    
    // Ensure proper prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, RuleError.prototype);
  }
}

/**
 * Error thrown when AST normalization fails
 */
export class NormalizationError extends ConversionError {
  /**
   * Node type that caused the error
   */
  nodeType?: string;

  constructor(message: string, options?: { cause?: Error; nodeType?: string }) {
    super(message, options);
    this.name = 'NormalizationError';
    this.nodeType = options?.nodeType;
    
    // Ensure proper prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, NormalizationError.prototype);
  }
}

/**
 * Error thrown when rendering fails
 */
export class RenderError extends ConversionError {
  /**
   * Node type that caused the error
   */
  nodeType?: string;

  constructor(message: string, options?: { cause?: Error; nodeType?: string }) {
    super(message, options);
    this.name = 'RenderError';
    this.nodeType = options?.nodeType;
    
    // Ensure proper prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, RenderError.prototype);
  }
}

/**
 * Formats an error into a user-friendly string
 * @param error The error to format
 * @returns Formatted error message
 */
export function formatError(error: unknown): string {
  if (error instanceof ConversionError) {
    let message = `${error.name}: ${error.message}`;
    
    if (error instanceof RuleError && error.tagName) {
      message += ` (tag: ${error.tagName})`;
    }
    
    if (error instanceof NormalizationError && error.nodeType) {
      message += ` (node type: ${error.nodeType})`;
    }
    
    if (error instanceof RenderError && error.nodeType) {
      message += ` (node type: ${error.nodeType})`;
    }
    
    if (error.cause) {
      message += `\nCaused by: ${formatError(error.cause)}`;
    }
    
    return message;
  }
  
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  
  return String(error);
}