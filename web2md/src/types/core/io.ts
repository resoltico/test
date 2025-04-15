/**
 * Options for writing output
 */
export interface WriteOptions {
  /**
   * Source path of the input (file or URL)
   */
  sourcePath: string;
  
  /**
   * Whether the source is a URL
   */
  isUrl: boolean;
  
  /**
   * Path to write output to (null for stdout)
   */
  outputPath?: string | null;
  
  /**
   * Whether to create directories as needed
   */
  createDirs?: boolean;
}

/**
 * Input source types
 */
export enum InputSourceType {
  FILE = 'file',
  URL = 'url'
}

/**
 * Input source configuration
 */
export interface InputSource {
  /**
   * Type of input source
   */
  type: InputSourceType;
  
  /**
   * Path or URL of input source
   */
  path: string;
}
