import { z } from 'zod';
import { 
  tableSchema, 
  formSchema, 
  figureSchema, 
  quoteSchema 
} from './elements/index.js';

export const contentSchema = z.string();

export const sectionSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  title: z.string().optional(),
  level: z.number().optional(),
  content: z.array(contentSchema).optional(),
  table: tableSchema.optional(),
  form: formSchema.optional(),
  figure: figureSchema.optional(),
  quote: quoteSchema.optional(),
  formula: z.any().optional(), // Can be further defined if needed
  children: z.lazy(() => z.array(sectionSchema)).optional()
});

export type SectionSchema = z.infer<typeof sectionSchema>;
