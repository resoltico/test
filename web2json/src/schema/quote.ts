import { z } from 'zod';

// Schema for quotations
export const quoteSchema = z.object({
  type: z.literal('quote').optional(), // This is added by the document schema
  content: z.string(),
  source: z.string().optional()
});

export type Quote = z.infer<typeof quoteSchema>;
