import { readFile } from 'fs/promises';
import got from 'got';
import { Logger } from '../../shared/logger/index.js';

export class FileReader {
  constructor(private logger: Logger) {}
  
  /**
   * Read content from a file
   */
  async read(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf8');
      this.logger.debug(`Read ${content.length} bytes from file ${filePath}`);
      return content;
    } catch (error: any) {
      this.logger.error(`Failed to read file ${filePath}: ${error.message}`);
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }
}

export class URLReader {
  constructor(private logger: Logger) {}
  
  /**
   * Read content from a URL
   */
  async read(url: string): Promise<string> {
    try {
      // Validate URL
      new URL(url); // Will throw if invalid
      
      // Fetch content
      const response = await got(url);
      const content = response.body;
      
      this.logger.debug(`Read ${content.length} bytes from URL ${url}`);
      return content;
    } catch (error: any) {
      if (error instanceof TypeError) {
        this.logger.error(`Invalid URL: ${url}`);
        throw new Error(`Invalid URL: ${url}`);
      }
      
      this.logger.error(`Failed to fetch URL ${url}: ${error.message}`);
      throw new Error(`Failed to fetch URL ${url}: ${error.message}`);
    }
  }
}