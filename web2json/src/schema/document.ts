import { z } from 'zod';
import { sectionSchema } from './section.js';
import { quoteSchema } from './quote.js';

// Add children field to quoteSchema for compatibility with the expected output
const extendedQuoteSchema = quoteSchema.extend({
  children: z.array(z.any()).default([])
});

// Schema for the entire document
export const documentSchema = z.object({
  title: z.string(),
  content: z.array(
    z.union([
      sectionSchema,
      z.object({
        type: z.literal('article'),
        id: z.string(),
        children: z.array(sectionSchema)
      }),
      z.object({
        type: z.literal('search'),
        content: z.string(),
        children: z.array(z.any()).default([])
      }),
      extendedQuoteSchema.extend({
        type: z.literal('quote')
      }),
      z.object({
        type: z.literal('footer'),
        content: z.array(z.string()),
        children: z.array(z.any()).default([])
      })
    ])
  )
});

export type Document = z.infer<typeof documentSchema>;
