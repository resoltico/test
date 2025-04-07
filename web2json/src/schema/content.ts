// src/schema/content.ts
import { z } from 'zod';

// Basic content primitives
export const TextContentSchema = z.string();

// Schema for definition lists
export const DefinitionListItemSchema = z.object({
  term: z.string(),
  definition: z.string()
});

export const DefinitionListSchema = z.array(DefinitionListItemSchema);

// Reusable schema for content arrays
export const ContentArraySchema = z.array(z.string());

// Schema for ordered and unordered lists
export const ListSchema = z.array(z.string());

// Quote schema
export const QuoteSchema = z.object({
  content: z.string(),
  source: z.string().optional()
});

export type Quote = z.infer<typeof QuoteSchema>;
