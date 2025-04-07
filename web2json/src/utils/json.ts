import { logger } from './logger.js';
import { documentSchema } from '../schema/document.js';

/**
 * Writes JSON to a string with proper indentation
 */
export function formatJson(data: unknown): string {
  // Space value of 2 gives a nice readable indentation
  return JSON.stringify(data, null, 2);
}

/**
 * Validates output JSON against our schema
 */
export function validateJsonStructure(data: unknown): boolean {
  try {
    // Use Zod to validate the structure
    const result = documentSchema.safeParse(data);
    
    if (!result.success) {
      logger.error('JSON validation failed', new Error(result.error.message));
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('JSON validation error', error as Error);
    return false;
  }
}

/**
 * Safely stringifies values, handling circular references
 */
export function safeStringify(obj: unknown): string {
  // Create a cache to store seen objects
  const cache = new Set();
  
  return JSON.stringify(obj, (key, value) => {
    // Skip functions and symbols
    if (typeof value === 'function' || typeof value === 'symbol') {
      return undefined;
    }
    
    // Handle null and primitives
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    // Handle circular references
    if (cache.has(value)) {
      return '[Circular Reference]';
    }
    
    // Add to cache
    cache.add(value);
    
    return value;
  }, 2);
}