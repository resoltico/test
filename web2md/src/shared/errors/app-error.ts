/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message: string, public code: string = 'APP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    // Maintaining proper stack traces in custom errors
    Error.captureStackTrace(this, this.constructor);
  }
}
