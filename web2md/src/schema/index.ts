/**
 * Schema Module Entry Point
 * 
 * Handles loading schema from files and provides access to the schema functionality.
 */

import fs from 'fs/promises';
import { Schema, validateSchema } from './validation.js';
import { defaultSchema } from './default.js';

/**
 * Load a schema from a file
 * 
 * @param path - Path to the schema file (JSON)
 * @returns The validated schema
 * @throws Error if the file cannot be read or the schema is invalid
 */
export async function loadSchema(path: string): Promise<Schema> {
  try {
    // Read the file
    const content = await fs.readFile(path, 'utf8');
    
    // Parse the JSON
    const schemaData = JSON.parse(content);
    
    // Validate the schema
    return validateSchema(schemaData);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load schema: ${error.message}`);
    } else {
      throw new Error('Failed to load schema: Unknown error');
    }
  }
}

/**
 * Get the default schema
 * 
 * @returns The default schema
 */
export function getDefaultSchema(): Schema {
  return defaultSchema;
}

export { Schema, validateSchema } from './validation.js';