/**
 * IO module type definitions
 */

/**
 * Interface for file system operations
 */
export interface FileSystemInterface {
  /**
   * Reads a file from the file system
   */
  readFile(path: string, encoding?: string): Promise<string>;
  
  /**
   * Writes a file to the file system
   */
  writeFile(path: string, content: string): Promise<void>;
  
  /**
   * Checks if a file exists
   */
  fileExists(path: string): Promise<boolean>;
  
  /**
   * Reads all files in a directory recursively
   */
  readDirectory(dir: string): Promise<string[]>;
}

/**
 * Interface for HTTP operations
 */
export interface HttpInterface {
  /**
   * Fetches content from a URL
   */
  fetchUrl(url: string): Promise<string>;
}
