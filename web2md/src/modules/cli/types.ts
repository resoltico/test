/**
 * CLI module type definitions
 */

/**
 * Options parsed from the command line
 */
export interface CLIOptions {
  /**
   * The file to convert
   */
  file?: string;
  
  /**
   * The URL to convert
   */
  url?: string;
  
  /**
   * The output file path
   */
  output?: string;
  
  /**
   * The directory containing custom rules
   */
  rulesDir?: string;
  
  /**
   * Whether to enable debug mode
   */
  debug?: boolean;
}
