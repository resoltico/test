import { z } from 'zod';

// Schema for quotes
export const quoteSchema = z.object({
  content: z.string(),
  source: z.string().optional(),
});

export type Quote = z.infer<typeof quoteSchema>;
