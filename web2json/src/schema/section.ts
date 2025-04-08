import { z } from 'zod';
import { tableSchema } from './table.js';
import { formSchema } from './form.js';
import { figureSchema } from './figure.js';

// Define the formula schema for mathematical content, lists, code blocks, etc.
const formulaSchema = z.object({
  description: z.string(),
  terms: z.array(
    z.object({
      term: z.string(),
      definition: z.string()
    })
  ).default([]),
  code: z.string().optional(),
  'ordered-list': z.array(z.string()).optional(),
  'unordered-list': z.array(z.string()).optional()
});

// Use a recursive schema pattern to allow for section nesting
// First declare a placeholder for the recursive schema
let innerSectionSchema: z.ZodType<any>;

// Export the schema using lazy evaluation to handle recursion
export const sectionSchema = z.lazy(() => innerSectionSchema);

// Define the actual section schema with all required properties
innerSectionSchema = z.object({
  type: z.enum(['section', 'aside']).default('section'),
  id: z.string(),
  title: z.string().optional(),
  level: z.number().int().min(1).max(6).optional(),
  content: z.array(z.string()).default([]),
  children: z.array(sectionSchema).default([]),
  // Special element schemas
  table: tableSchema.optional(),
  form: formSchema.optional(),
  figure: figureSchema.optional(),
  formula: formulaSchema.optional()
}).passthrough(); // Allow additional properties for extensibility

export type Section = z.infer<typeof sectionSchema>;
export type Formula = z.infer<typeof formulaSchema>;