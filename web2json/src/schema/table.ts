// src/schema/table.ts
import { z } from 'zod';

// Schema for table cells, rows, and the entire table
export const TableSchema = z.object({
  caption: z.string().optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())),
  footer: z.string().optional()
});

export type Table = z.infer<typeof TableSchema>;
