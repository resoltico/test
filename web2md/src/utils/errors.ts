/**
 * Error Utilities
 * 
 * Provides utilities for handling errors in a consistent way.
 */

import chalk from 'chalk';

/**
 * Handle an error consistently across the application
 * 
 * @param error - The error to handle
 */
export function handleError(error: unknown): void {
  if (error instanceof Error) {
    // Handle standard Error objects
    console.error(chalk.red(`Error: ${error.message}`));
    
    // If we're in development mode, show the stack trace
    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray(error.stack));
    }
  } else if (typeof error === 'string') {
    // Handle string errors
    console.error(chalk.red(`Error: ${error}`));
  } else {
    // Handle unknown error types
    console.error(chalk.red('An unknown error occurred'));
  }
}

/**
 * Convert an error to a string message
 * 
 * @param error - The error to convert
 * @returns A string representation of the error
 */
export function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred';
  }
}