import { z } from 'zod';
import { tableSchema } from './table.js';
import { formSchema } from './form.js';
import { figureSchema } from './figure.js';

// Define formula schema separately to avoid repetition
const formulaSchema = z.object({
  description: z.string(),
  terms: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })),
  code: z.string().optional(),
  'ordered-list': z.array(z.string()).optional(),
  'unordered-list': z.array(z.string()).optional()
});

// This is a well-established pattern for recursive Zod schemas
// First declare the inner shape without setting it
// eslint-disable-next-line prefer-const
let sectionSchemaInner: z.ZodType<any>;

// Create the main schema with a reference to the inner schema
export const sectionSchema = z.lazy(() => sectionSchemaInner);

// Now define the inner schema using the lazy reference to itself
sectionSchemaInner = z.object({
  type: z.literal('section'),
  id: z.string().optional(),
  title: z.string().optional(),
  level: z.number().int().min(1).max(6).optional(),
  content: z.array(z.string()),
  // Optional elements that may be present in a section
  table: tableSchema.optional(),
  form: formSchema.optional(),
  figure: figureSchema.optional(),
  // Formula related structures for mathematical content
  formula: formulaSchema.optional(),
  // Children sections (hierarchical)
  children: z.array(sectionSchema).default([])
});

// Export the Section type
export type Section = z.infer<typeof sectionSchema>;
