import { z } from 'zod';
import { sectionSchema } from './section.js';
import { quoteSchema } from './quote.js';

// Create schema for article elements
const articleSchema = z.object({
  type: z.literal('article'),
  id: z.string(),
  children: z.array(z.lazy(() => sectionSchema))
});

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

// Schema for the entire document
export const documentSchema = z.object({
  title: z.string(),
  content: z.array(
    z.union([
      sectionSchema,
      articleSchema,
      quoteSchema.extend({
        type: z.literal('quote'),
        children: z.array(z.any()).default([])
      }),
      searchSchema,
      footerSchema
    ])
  )
});

export type Document = z.infer<typeof documentSchema>;
export type ArticleContent = z.infer<typeof articleSchema>;
export type SearchContent = z.infer<typeof searchSchema>;
export type FooterContent = z.infer<typeof footerSchema>;
