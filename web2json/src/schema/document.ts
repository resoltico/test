import { z } from 'zod';
import { sectionSchema } from './section.js';
import { quoteSchema } from './quote.js';

// Create schema for article elements
const articleSchema = z.object({
  type: z.literal('article'),
  id: z.string(),
  children: z.array(z.lazy(() => sectionSchema))
});

// Schema for aside elements (similar to sections but with a different type)
// We can't directly extend sectionSchema because it's a lazy type
const asideSchema = z.object({
  type: z.literal('aside'),
  id: z.string(),
  title: z.string().optional(),
  level: z.number().int().min(1).max(6).optional(),
  content: z.array(z.string()).default([]),
  children: z.array(z.lazy(() => sectionSchema)).default([]),
  // Special element schemas - same as in sectionSchema
  table: z.any().optional(),
  form: z.any().optional(),
  figure: z.any().optional(),
  formula: z.any().optional()
}).passthrough();

// Schema for search elements
const searchSchema = z.object({
  type: z.literal('search'),
  content: z.string(),
  children: z.array(z.any()).default([])
});

// Schema for footer elements
const footerSchema = z.object({
  type: z.literal('footer'),
  content: z.array(z.string()),
  children: z.array(z.any()).default([])
});

// Schema for header elements
const headerSchema = z.object({
  type: z.literal('header'),
  content: z.array(z.string()),
  children: z.array(z.any()).default([])
});

// Extended quote schema that includes type and children
const documentQuoteSchema = quoteSchema.extend({
  type: z.literal('quote'),
  children: z.array(z.any()).default([])
});

// Schema for the entire document
export const documentSchema = z.object({
  title: z.string(),
  content: z.array(
    z.union([
      sectionSchema,
      articleSchema,
      asideSchema,
      documentQuoteSchema,
      searchSchema,
      footerSchema,
      headerSchema
    ])
  )
});

export type Document = z.infer<typeof documentSchema>;
export type ArticleContent = z.infer<typeof articleSchema>;
export type AsideContent = z.infer<typeof asideSchema>;
export type SearchContent = z.infer<typeof searchSchema>;
export type FooterContent = z.infer<typeof footerSchema>;
export type HeaderContent = z.infer<typeof headerSchema>;
export type DocumentQuoteContent = z.infer<typeof documentQuoteSchema>;