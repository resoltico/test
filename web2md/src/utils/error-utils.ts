/**
 * Error class for fetching operations
 */
export class FetchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FetchError';
  }
}

/**
 * Error class for conversion operations
 */
export class ConversionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConversionError';
  }
}

/**
 * Error class for schema operations
 */
export class SchemaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SchemaError';
  }
}
