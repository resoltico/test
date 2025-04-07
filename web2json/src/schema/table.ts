import { z } from 'zod';

// Schema for tables
export const tableSchema = z.object({
  caption: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  footer: z.string().optional()
});

export type Table = z.infer<typeof tableSchema>;
