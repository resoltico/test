import { z } from 'zod';
import { sectionSchema } from './section.js';

// Schema for the entire document
export const documentSchema = z.object({
  title: z.string(),
  content: z.array(
    z.union([
      sectionSchema,
      z.lazy(() => z.object({
        type: z.literal('article'),
        id: z.string().optional(),
        children: z.array(sectionSchema)
      })),
      z.lazy(() => z.object({
        type: z.literal('search'),
        content: z.string(),
        children: z.array(z.any()).default([])
      })),
      z.lazy(() => z.object({
        type: z.literal('quote'),
        content: z.string(),
        source: z.string().optional(),
        children: z.array(z.any()).default([])
      })),
      z.lazy(() => z.object({
        type: z.literal('footer'),
        content: z.array(z.string()),
        children: z.array(z.any()).default([])
      }))
    ])
  )
});

export type Document = z.infer<typeof documentSchema>;
