import { HTTPOptions } from './http.js';

/**
 * Deobfuscation configuration
 */
export interface DeobfuscationConfig {
  /**
   * Enable deobfuscation
   */
  enabled: boolean;
  
  /**
   * List of enabled decoders
   */
  decoders: string[];
  
  /**
   * Convert decoded emails to mailto: links
   */
  emailLinks: boolean;
  
  /**
   * Remove deobfuscation scripts when found
   */
  cleanScripts: boolean;
  
  /**
   * Keep the original link in an HTML comment
   */
  preserveRawLinks: boolean;
}

/**
 * Main application configuration
 */
export interface Config {
  /**
   * Heading style (atx or setext)
   */
  headingStyle: 'atx' | 'setext';
  
  /**
   * List marker character
   */
  listMarker: '-' | '*' | '+';
  
  /**
   * Code block style (indented or fenced)
   */
  codeBlockStyle: 'indented' | 'fenced';
  
  /**
   * Preserve table alignment
   */
  preserveTableAlignment: boolean;
  
  /**
   * Tags to ignore during conversion
   */
  ignoreTags: string[];
  
  /**
   * Use all built-in rules
   */
  useBuiltInRules?: boolean;
  
  /**
   * Specific built-in rule sets to use
   */
  builtInRules?: string[];
  
  /**
   * Custom rules to use
   */
  customRules?: string[];
  
  /**
   * HTTP options
   */
  http?: HTTPOptions;
  
  /**
   * Deobfuscation options
   */
  deobfuscation: DeobfuscationConfig;
  
  /**
   * Debug mode
   */
  debug: boolean;
}

/**
 * Application options when creating the app
 */
export interface AppOptions {
  /**
   * Root directory for rule loading
   */
  rootDir: string;
}

/**
 * CLI command options
 */
export interface CLICommandOptions {
  /**
   * HTML file to convert
   */
  file?: string;
  
  /**
   * URL to convert
   */
  url?: string;
  
  /**
   * Output file
   */
  output?: string;
  
  /**
   * Custom user agent string
   */
  userAgent?: string;
  
  /**
   * Rules directory
   */
  rulesDir?: string;
  
  /**
   * Force enable deobfuscation
   */
  deobfuscate?: boolean;
  
  /**
   * Debug mode
   */
  debug?: boolean;
  
  /**
   * Save original HTML content to file
   */
  saveOriginal?: boolean;
  
  /**
   * Enable/disable compression support
   */
  compression?: boolean;
}

/**
 * Output writer options
 */
export interface OutputOptions {
  /**
   * Source path (file or URL)
   */
  sourcePath: string;
  
  /**
   * Whether the source is a URL
   */
  isUrl: boolean;
  
  /**
   * Output path (optional, stdout if not provided)
   */
  outputPath?: string;
  
  /**
   * Create directories if they don't exist
   */
  createDirs?: boolean;
}