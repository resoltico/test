import { z } from 'zod';

export const ConfigSchema = z.object({
  headingStyle: z.enum(['atx', 'setext']).default('atx'),
  listMarker: z.enum(['-', '*', '+']).default('-'),
  codeBlockStyle: z.enum(['fenced', 'indented']).default('fenced'),
  preserveTableAlignment: z.boolean().default(true),
  ignoreTags: z.array(z.string()).default([]),
  useBuiltInRules: z.boolean().optional(),
  builtInRules: z.array(z.string()).optional(),
  customRules: z.array(z.string()).optional(),
  debug: z.boolean().default(false)
});

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;