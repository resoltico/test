import { z } from 'zod';
import { sectionSchema } from './section.js';

export const documentSchema = z.object({
  title: z.string(),
  content: z.array(sectionSchema)
});

export type DocumentSchema = z.infer<typeof documentSchema>;
