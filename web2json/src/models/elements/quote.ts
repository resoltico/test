import { z } from 'zod';

export const quoteSchema = z.object({
  content: z.string(),
  source: z.string().optional()
});

export type QuoteSchema = z.infer<typeof quoteSchema>;
