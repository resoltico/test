/**
 * Schema Validation Module
 * 
 * Defines the schema structure and validation logic using Zod.
 * This ensures that user-provided schemas are correctly formatted.
 */

import { z } from 'zod';

// Define selector types
const SelectorSchema = z.string();

// Define action types
const ActionEnum = z.enum([
  'transform',
  'codeBlock',
  'remove',
  'keep',
  'heading',
  'list',
  'table'
]);

// Define rule options
const RuleOptionsSchema = z.object({
  // Generic options
  headingStyle: z.enum(['atx', 'setext']).optional(),
  includeCaption: z.boolean().optional(),
  
  // Code block options
  language: z.string().optional(),
  
  // Heading options
  level: z.number().min(1).max(6).optional(),
  
  // List options
  ordered: z.boolean().optional(),
  
  // Table options
  withHeader: z.boolean().optional(),
  
  // Other options
  dataAttributes: z.record(z.string()).optional(),
}).partial();

// Define rule structure
const RuleSchema = z.object({
  selector: SelectorSchema,
  action: ActionEnum,
  options: RuleOptionsSchema.optional()
});

// Define global settings
const GlobalSettingsSchema = z.object({
  headingStyle: z.enum(['atx', 'setext']).optional(),
  bulletListMarker: z.enum(['-', '*', '+']).optional(),
  emphasis: z.enum(['*', '_']).optional(),
  strong: z.enum(['**', '__']).optional(),
  fence: z.enum(['```', '~~~']).optional(),
  fences: z.boolean().optional(),
  incrementListMarker: z.boolean().optional(),
  listItemIndent: z.enum(['one', 'tab', 'mixed']).optional(),
  setext: z.boolean().optional()
}).partial();

// Define main schema structure
export const SchemaSchema = z.object({
  rules: z.array(RuleSchema).optional(),
  global: GlobalSettingsSchema.optional(),
  keep: z.array(SelectorSchema).optional(),
  remove: z.array(SelectorSchema).optional()
});

// Export type for the validated schema
export type Schema = z.infer<typeof SchemaSchema>;

/**
 * Validate a schema object against the defined schema
 * 
 * @param schema - The schema object to validate
 * @returns The validated schema
 * @throws Error if validation fails
 */
export function validateSchema(schema: unknown): Schema {
  return SchemaSchema.parse(schema);
}