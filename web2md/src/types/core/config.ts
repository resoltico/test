/**
 * Heading style options for Markdown output
 */
export type HeadingStyle = 'atx' | 'setext';

/**
 * List marker options for Markdown output
 */
export type ListMarker = '-' | '*' | '+';

/**
 * Code block style options for Markdown output
 */
export type CodeBlockStyle = 'fenced' | 'indented';

/**
 * Application configuration interface
 */
export interface Config {
  /**
   * Style of headings to use in Markdown output
   * - atx: Use # style (e.g., "# Heading")
   * - setext: Use underline style (e.g., "Heading\n===")
   */
  headingStyle: HeadingStyle;
  
  /**
   * Marker to use for bullet lists
   */
  listMarker: ListMarker;
  
  /**
   * Style of code blocks to use in Markdown output
   * - fenced: Use triple backticks
   * - indented: Use 4-space indentation
   */
  codeBlockStyle: CodeBlockStyle;
  
  /**
   * Whether to preserve table alignment in Markdown output
   */
  preserveTableAlignment: boolean;
  
  /**
   * Tags to completely ignore during conversion
   */
  ignoreTags: string[];
  
  /**
   * Whether to use all built-in rules
   */
  useBuiltInRules: boolean;
  
  /**
   * Specific built-in rule sets to use
   */
  builtInRules?: string[];
  
  /**
   * Custom rules to extend or override built-ins
   */
  customRules?: string[];
  
  /**
   * Enable debug mode for detailed logging
   */
  debug: boolean;

  /**
   * Whether to preserve raw URLs in links exactly as they appear in the HTML
   * When true, links won't be sanitized or modified in any way
   */
  preserveRawUrls: boolean;
}