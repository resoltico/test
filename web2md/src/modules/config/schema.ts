import { z } from 'zod';
import { Config } from '../../types/core/config.js';

/**
 * Zod schema for configuration validation
 */
export const configSchema = z.object({
  headingStyle: z.enum(['atx', 'setext']).default('setext'),
  listMarker: z.enum(['-', '*', '+']).default('-'),
  codeBlockStyle: z.enum(['fenced', 'indented']).default('fenced'),
  preserveTableAlignment: z.boolean().default(true),
  ignoreTags: z.array(z.string()).default(['script', 'style', 'noscript', 'iframe']),
  useBuiltInRules: z.boolean().optional(),
  builtInRules: z.array(z.string()).optional(),
  customRules: z.array(z.string()).optional(),
  debug: z.boolean().default(false),
  preserveRawUrls: z.boolean().default(true) // Default to preserving raw URLs
}).transform((data): Config => {
  // Handle mutual exclusivity between useBuiltInRules and builtInRules
  if (data.builtInRules !== undefined && data.builtInRules.length > 0) {
    return {
      ...data,
      useBuiltInRules: false
    };
  }
  
  // Default to useBuiltInRules: true if neither is specified
  if (data.useBuiltInRules === undefined && data.builtInRules === undefined) {
    return {
      ...data,
      useBuiltInRules: true
    };
  }
  
  return data as Config;
});

/**
 * Default configuration
 */
export const defaultConfig: Config = {
  headingStyle: 'setext',
  listMarker: '-',
  codeBlockStyle: 'fenced',
  preserveTableAlignment: true,
  ignoreTags: ['script', 'style', 'noscript', 'iframe'],
  useBuiltInRules: true,
  debug: false,
  preserveRawUrls: true // Default to preserving raw URLs
};