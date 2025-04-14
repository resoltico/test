/**
 * Configuration module type definitions
 */
import { BaseConfig } from '../../types.js';

/**
 * Configuration for the web2md application
 */
export interface Config extends BaseConfig {
  /**
   * Heading style to use in the generated Markdown
   */
  headingStyle: 'atx' | 'setext';
  
  /**
   * List marker character to use for unordered lists
   */
  listMarker: '-' | '*' | '+';
  
  /**
   * Code block style to use
   */
  codeBlockStyle: 'fenced' | 'indented';
  
  /**
   * Whether to preserve table alignment
   */
  preserveTableAlignment: boolean;
  
  /**
   * HTML tags to ignore (not convert to Markdown)
   */
  ignoreTags: string[];
  
  /**
   * Paths to rules to use for conversion
   */
  rules?: string[];
  
  /**
   * Whether to enable debug mode
   */
  debug: boolean;
}
