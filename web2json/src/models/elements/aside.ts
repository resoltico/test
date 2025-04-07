import { z } from 'zod';

export const asideSchema = z.object({
  title: z.string().optional(),
  content: z.array(z.string())
});

export type AsideSchema = z.infer<typeof asideSchema>;
