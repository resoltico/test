import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { HTTPClient } from '../http/client.js';
import { ContentDecoder } from '../decoder/content-decoder.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Reads content from files
 */
export class FileReader {
  constructor(private logger: Logger) {}
  
  /**
   * Read content from a file
   * @param path Path to the file
   * @returns The file content
   */
  async read(path: string): Promise<string> {
    try {
      const absPath = resolve(process.cwd(), path);
      this.logger.debug(`Reading file: ${absPath}`);
      
      // Check file exists
      await fs.access(absPath);
      
      // Read the file
      const content = await fs.readFile(absPath, 'utf-8');
      this.logger.debug(`Successfully read ${content.length} bytes from ${absPath}`);
      
      return content;
    } catch (error) {
      this.logger.error(`Failed to read file: ${path}`);
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Reads content from URLs
 */
export class URLReader {
  constructor(
    private httpClient: HTTPClient,
    private contentDecoder: ContentDecoder,
    private logger: Logger
  ) {}
  
  /**
   * Read content from a URL
   * @param url The URL to read
   * @returns The URL content
   */
  async read(url: string): Promise<string> {
    this.logger.info(`Fetching content from URL: ${url}`);
    
    try {
      // Fetch the content using the HTTP client
      const response = await this.httpClient.fetch(url);
      
      // Check for successful response
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`HTTP error: ${response.statusCode}`);
      }
      
      // Decode the content (handle compression and character encoding)
      const content = await this.contentDecoder.decode(response);
      
      this.logger.debug(`Successfully fetched and decoded content from ${url}`);
      
      return content;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to fetch URL ${url}: ${error.message}`);
      }
      throw error;
    }
  }
}
