import { z } from 'zod';
import { Config } from '../../types/core/config.js';
import { HTTPDefaults } from '../http/defaults.js';

/**
 * Zod schema for configuration validation
 */
export const configSchema = z.object({
  // Markdown formatting options
  headingStyle: z.enum(['atx', 'setext']).default('setext'),
  listMarker: z.enum(['-', '*', '+']).default('*'),
  codeBlockStyle: z.enum(['indented', 'fenced']).default('indented'),
  preserveTableAlignment: z.boolean().default(true),
  
  // HTML processing options
  ignoreTags: z.array(z.string()).default(['script', 'style', 'noscript', 'iframe']),
  
  // Rules configuration
  useBuiltInRules: z.boolean().optional(),
  builtInRules: z.array(z.string()).optional(),
  customRules: z.array(z.string()).optional(),
  
  // HTTP options - this needs to match HTTPOptions structure
  http: z.object({
    userAgent: z.string().default(HTTPDefaults.getDefaultOptions().userAgent),
    compression: z.object({
      enabled: z.boolean().default(true),
      formats: z.array(z.string()).default(['gzip', 'br', 'deflate'])
    }).default(HTTPDefaults.getDefaultOptions().compression),
    requestOptions: z.object({
      timeout: z.number().default(30000),
      retry: z.number().default(3),
      followRedirects: z.boolean().default(true),
      maxRedirects: z.number().default(10),
      throwHttpErrors: z.boolean().default(false)
    }).default(HTTPDefaults.getDefaultOptions().requestOptions),
    cookies: z.object({
      enabled: z.boolean().default(true),
      jar: z.boolean().default(true)
    }).default(HTTPDefaults.getDefaultOptions().cookies),
    headers: z.record(z.string()).default(HTTPDefaults.getDefaultOptions().headers),
    proxy: z.object({
      enabled: z.boolean().default(false),
      url: z.string().default(''),
      auth: z.object({
        username: z.string().default(''),
        password: z.string().default('')
      }).default(HTTPDefaults.getDefaultOptions().proxy.auth)
    }).default(HTTPDefaults.getDefaultOptions().proxy)
  }).optional().default(HTTPDefaults.getDefaultOptions()),
  
  // Deobfuscation options
  deobfuscation: z.object({
    enabled: z.boolean().default(true),
    decoders: z.array(z.string()).default(['cloudflare', 'base64', 'rot13']),
    emailLinks: z.boolean().default(true),
    cleanScripts: z.boolean().default(true),
    preserveRawLinks: z.boolean().default(false)
  }).default({
    enabled: true,
    decoders: ['cloudflare', 'base64', 'rot13'],
    emailLinks: true,
    cleanScripts: true,
    preserveRawLinks: false
  }),
  
  // Math processing options
  math: z.object({
    enabled: z.boolean().default(true),
    inlineDelimiter: z.string().default('$'),
    blockDelimiter: z.string().default('$$'),
    preserveOriginal: z.boolean().default(true),
    outputFormat: z.string().default('latex'),
    selectors: z.object({
      mathml: z.string().optional().default('math'),
      scripts: z.string().optional().default('script[type*="math/tex"], script[type*="math/asciimath"]'),
      dataAttributes: z.string().optional().default('[data-math], [data-latex], [data-mathml], [data-asciimath]')
    }).optional().default({
      mathml: 'math',
      scripts: 'script[type*="math/tex"], script[type*="math/asciimath"]',
      dataAttributes: '[data-math], [data-latex], [data-mathml], [data-asciimath]'
    })
  }).default({
    enabled: true,
    inlineDelimiter: '$',
    blockDelimiter: '$$',
    preserveOriginal: true,
    outputFormat: 'latex',
    selectors: {
      mathml: 'math',
      scripts: 'script[type*="math/tex"], script[type*="math/asciimath"]',
      dataAttributes: '[data-math], [data-latex], [data-mathml], [data-asciimath]'
    }
  }),
  
  // Debug mode
  debug: z.boolean().default(false)
});

/**
 * Type definition for config based on the schema
 */
export type ValidatedConfig = z.infer<typeof configSchema>;

/**
 * Get the default configuration
 */
export function getDefaultConfig(): Config {
  return configSchema.parse({});
}