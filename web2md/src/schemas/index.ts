import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// Fix: Import Ajv correctly using dynamic import to avoid TypeScript type issues
import { z } from 'zod';
import { SchemaError } from '../utils/error-utils.js';
// Import like this to avoid TypeScript's static checking
// @ts-ignore - Bypass TypeScript's type checking for this import
import ajv from 'ajv';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the schema structure for rule filter
export type RuleFilter = 
  | string 
  | string[] 
  | ((node: HTMLElement, options: any) => boolean);

// Define the schema structure for rules
export interface Rule {
  name: string;
  filter: RuleFilter | string;
  replacement: string;
}

// Define the schema structure
export interface Schema {
  rules: Rule[];
  keep?: (string | string[] | string)[];
  remove?: (string | string[] | string)[];
}

// Default schema path in the package
const DEFAULT_SCHEMA_PATH = path.resolve(__dirname, 'custom-schema.json');

// Zod schema for validation
const ruleSchema = z.object({
  name: z.string(),
  filter: z.union([
    z.string(),
    z.array(z.string()),
    z.string().refine(val => val.startsWith('function') || val.startsWith('('), {
      message: 'Function must be a valid JavaScript function string'
    })
  ]),
  replacement: z.string().refine(val => val.startsWith('function') || val.startsWith('('), {
    message: 'Replacement must be a valid JavaScript function string'
  })
});

const schemaSchema = z.object({
  rules: z.array(ruleSchema),
  keep: z.array(z.union([
    z.string(),
    z.array(z.string()),
    z.string().refine(val => val.startsWith('function') || val.startsWith('('), {
      message: 'Keep function must be a valid JavaScript function string'
    })
  ])).optional(),
  remove: z.array(z.union([
    z.string(),
    z.array(z.string()),
    z.string().refine(val => val.startsWith('function') || val.startsWith('('), {
      message: 'Remove function must be a valid JavaScript function string'
    })
  ])).optional()
});

/**
 * Loads and validates a conversion schema
 * @param schemaPath Path to the schema JSON file
 * @returns The loaded schema
 * @throws {SchemaError} If loading or validation fails
 */
export async function loadSchema(schemaPath = DEFAULT_SCHEMA_PATH): Promise<Schema> {
  try {
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent) as Schema;
    
    // Skip Ajv validation entirely due to TypeScript/ESM compatibility issues
    // Use a simpler validation approach that doesn't require Ajv
    
    // Basic schema validation
    if (!schema.rules || !Array.isArray(schema.rules)) {
      throw new SchemaError('Invalid schema: rules must be an array');
    }
    
    for (const rule of schema.rules) {
      if (!rule.name || !rule.filter || !rule.replacement) {
        throw new SchemaError('Invalid schema: each rule must have name, filter, and replacement properties');
      }
    }
    
    // Additional validation with Zod for function strings
    try {
      schemaSchema.parse(schema);
    } catch (error) {
      throw new SchemaError(`Schema validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return schema;
  } catch (error) {
    if (error instanceof SchemaError) {
      throw error;
    }
    throw new SchemaError(`Failed to load schema from ${schemaPath}`, { cause: error });
  }
}
