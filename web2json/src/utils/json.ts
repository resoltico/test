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
    // Make sure sections have required properties
    ensureRequiredProperties(data);
    
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
 * Ensure all required properties are present in the document structure
 */
function ensureRequiredProperties(data: any): void {
  if (!data || typeof data !== 'object') return;
  
  // Handle arrays recursively
  if (Array.isArray(data)) {
    data.forEach(item => ensureRequiredProperties(item));
    return;
  }
  
  // Handle section objects
  if (data.type === 'section' || data.type === 'aside') {
    // Ensure required arrays exist
    if (!Array.isArray(data.content)) {
      data.content = [];
    }
    
    if (!Array.isArray(data.children)) {
      data.children = [];
    }
    
    // Process formula if it exists
    if (data.formula && !Array.isArray(data.formula.terms)) {
      data.formula.terms = [];
    }
  }
  
  // Process children recursively
  if (data.children && Array.isArray(data.children)) {
    data.children.forEach((child: any) => ensureRequiredProperties(child));
  }
  
  // Process content objects
  if (data.content && Array.isArray(data.content)) {
    data.content.forEach((item: any) => {
      if (item && typeof item === 'object') {
        ensureRequiredProperties(item);
      }
    });
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

/**
 * Clean up the JSON structure to match the expected format
 * Remove empty arrays, null values, etc.
 */
export function cleanupJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  if (Array.isArray(obj)) {
    // Filter out null/undefined values from arrays
    const filtered = obj
      .map(item => cleanupJson(item))
      .filter(item => item !== undefined);
    
    // Return empty array instead of undefined for required arrays
    return filtered;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    
    // Process object properties
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = cleanupJson(value);
      
      // Include empty arrays for required fields
      if (cleaned !== undefined || 
          (key === 'content' || key === 'children' || key === 'terms')) {
        result[key] = cleaned === undefined && 
                     (key === 'content' || key === 'children' || key === 'terms') 
                     ? [] : cleaned;
      }
    }
    
    // Make sure sections have required properties
    if (obj.type === 'section' || obj.type === 'aside') {
      if (!result.content) result.content = [];
      if (!result.children) result.children = [];
    }
    
    return result;
  }
  
  // Return primitive values as-is
  return obj;
}
