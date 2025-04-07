import { z } from 'zod';

export const tableSchema = z.object({
  caption: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  footer: z.string().optional()
});

export type TableSchema = z.infer<typeof tableSchema>;
