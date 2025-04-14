/**
 * Configuration schema validation
 */
import { z } from 'zod';

/**
 * Zod schema for the configuration
 */
export const configSchema = z.object({
  headingStyle: z.enum(['atx', 'setext']).default('atx'),
  listMarker: z.enum(['-', '*', '+']).default('-'),
  codeBlockStyle: z.enum(['fenced', 'indented']).default('fenced'),
  preserveTableAlignment: z.boolean().default(true),
  ignoreTags: z.array(z.string()).default([]),
  rules: z.array(z.string()).optional(),
  debug: z.boolean().default(false)
});

/**
 * Default configuration values
 * Note: This creates a config with potentially readonly arrays,
 * which should be spread into a new array when used to ensure mutability.
 */
export const defaultConfig = {
  headingStyle: 'atx',
  listMarker: '-',
  codeBlockStyle: 'fenced',
  preserveTableAlignment: true,
  ignoreTags: [] as string[], // Explicitly typed as string[] to avoid readonly inference
  debug: false
} as const;
