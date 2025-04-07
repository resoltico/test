// src/schema/section.ts
import { z } from 'zod';
import { ContentArraySchema } from './content.js';
import { TableSchema } from './table.js';
import { FormSchema } from './form.js';
import { QuoteSchema } from './content.js';

// SVG schema for figures
export const SvgElementSchema = z.object({
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fill: z.string().optional(),
  content: z.string().optional(),
  fontSize: z.number().optional()
  // Other SVG attributes can be added as needed
});

export const SvgSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  viewBox: z.string().optional(),
  elements: z.array(SvgElementSchema)
});

// Figure schema
export const FigureSchema = z.object({
  caption: z.string().optional(),
  svg: SvgSchema.optional()
});

// Formula schema
export const FormulaSchema = z.object({
  description: z.string().optional(),
  terms: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })).optional(),
  code: z.string().optional(),
  'ordered-list': z.array(z.string()).optional(),
  'unordered-list': z.array(z.string()).optional()
});

// Define a recursive section schema
export const SectionSchema: z.ZodType<any> = z.lazy(() => 
  z.object({
    type: z.enum(['section', 'article', 'aside', 'header', 'footer', 'nav', 'div', 'search']),
    id: z.string().optional(),
    title: z.string().optional(),
    level: z.number().min(1).max(6).optional(),
    content: ContentArraySchema.optional(),
    children: z.array(SectionSchema).optional(),
    table: TableSchema.optional(),
    form: FormSchema.optional(),
    figure: FigureSchema.optional(),
    formula: FormulaSchema.optional(),
    quote: QuoteSchema.optional()
  })
);

export type Section = z.infer<typeof SectionSchema>;
export type Figure = z.infer<typeof FigureSchema>;
export type Svg = z.infer<typeof SvgSchema>;
export type Formula = z.infer<typeof FormulaSchema>;
