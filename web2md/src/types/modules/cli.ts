/**
 * CLI command options
 */
export interface CLICommandOptions {
  /**
   * Path to HTML file to convert
   */
  file?: string;
  
  /**
   * URL to fetch and convert
   */
  url?: string;
  
  /**
   * Output file (default: stdout)
   */
  output?: string;
  
  /**
   * Directory containing rule manifest (overrides config)
   */
  rulesDir?: string;
  
  /**
   * Enable debug mode
   */
  debug?: boolean;
}

/**
 * Application options for creating app instance
 */
export interface AppOptions {
  /**
   * Root directory for application
   */
  rootDir: string;
}
