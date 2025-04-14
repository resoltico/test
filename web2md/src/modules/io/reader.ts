/**
 * Content reader implementations for files and URLs
 */
import { FileSystemInterface, HttpInterface } from './types.js';
import { Logger } from '../../types.js';
import { resolvePathFromCwd } from '../../shared/utils/path-utils.js';

/**
 * Reads content from a file
 */
export class FileReader {
  constructor(
    private fsAdapter: FileSystemInterface,
    private logger: Logger
  ) {}
  
  /**
   * Reads content from a file path
   */
  async read(filePath: string): Promise<string> {
    const resolvedPath = resolvePathFromCwd(filePath);
    this.logger.info(`Reading file from ${resolvedPath}`);
    
    // Check if file exists
    const exists = await this.fsAdapter.fileExists(resolvedPath);
    if (!exists) {
      throw new Error(`File not found: ${resolvedPath}`);
    }
    
    return this.fsAdapter.readFile(resolvedPath);
  }
}

/**
 * Reads content from a URL
 */
export class URLReader {
  constructor(
    private httpAdapter: HttpInterface,
    private logger: Logger
  ) {}
  
  /**
   * Reads content from a URL
   */
  async read(url: string): Promise<string> {
    this.logger.info(`Reading content from URL: ${url}`);
    
    // Ensure URL has a protocol
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    
    return this.httpAdapter.fetchUrl(urlWithProtocol);
  }
}
