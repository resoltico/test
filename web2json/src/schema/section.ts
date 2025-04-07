import { z } from 'zod';
import { tableSchema } from './table.js';
import { formSchema } from './form.js';
import { figureSchema } from './figure.js';

// Define the formula schema for mathematical content
const formulaSchema = z.object({
  description: z.string(),
  terms: z.array(
    z.object({
      term: z.string(),
      definition: z.string()
    })
  ),
  code: z.string().optional(),
  'ordered-list': z.array(z.string()).optional(),
  'unordered-list': z.array(z.string()).optional()
});

// Use a recursive schema pattern to allow for section nesting
// First declare a placeholder
let innerSectionSchema: z.ZodType<any>;

// Export the schema using lazy evaluation to handle recursion
export const sectionSchema = z.lazy(() => innerSectionSchema);

// Define the actual section schema using the recursion point
innerSectionSchema = z.object({
  type: z.literal('section'),
  id: z.string(),
  title: z.string().optional(),
  level: z.number().int().min(1).max(6).optional(),
  content: z.array(z.string()),
  children: z.array(sectionSchema).default([]),
  // Special element schemas
  table: tableSchema.optional(),
  form: formSchema.optional(),
  figure: figureSchema.optional(),
  formula: formulaSchema.optional()
});

export type Section = z.infer<typeof sectionSchema>;
export type Formula = z.infer<typeof formulaSchema>;
