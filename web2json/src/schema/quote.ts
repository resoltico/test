import { z } from 'zod';

// Schema for quotes - updated to match expected output
export const quoteSchema = z.object({
  content: z.string(),
  source: z.string().optional(),
  children: z.array(z.any()).optional()
});

export type Quote = z.infer<typeof quoteSchema>;
