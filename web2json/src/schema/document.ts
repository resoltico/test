// src/schema/document.ts
import { z } from 'zod';
import { SectionSchema } from './section.js';

// Document metadata schema
export const MetadataSchema = z.object({
  url: z.string().url().optional(),
  baseUrl: z.string().url().optional(),
  language: z.string().optional(),
  description: z.string().optional()
});

// Top-level document schema
export const DocumentSchema = z.object({
  title: z.string().optional(),
  metadata: MetadataSchema.optional(),
  content: z.array(SectionSchema)
});

export type Document = z.infer<typeof DocumentSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
