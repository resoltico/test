/**
 * Writes JSON to a file with proper indentation
 */
export function formatJson(data: unknown): string {
  // Space value of 2 gives a nice readable indentation
  return JSON.stringify(data, null, 2);
}

/**
 * Validates output JSON against our schema
 */
export function validateJsonStructure(data: unknown): boolean {
  // Basic structure validation - check if it's an object with expected properties
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Cast to any to check properties
  const doc = data as any;
  
  // Check required top-level properties
  if (!doc.title || !Array.isArray(doc.content)) {
    return false;
  }
  
  return true;
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
