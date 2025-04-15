import fs from 'node:fs/promises';
import path from 'node:path';
import got from 'got';
import { IOError } from '../../shared/errors/app-error.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * File reader
 */
export class FileReader {
  constructor(private logger: Logger) {}

  /**
   * Read HTML from file
   */
  async read(filePath: string): Promise<string> {
    try {
      // Resolve path if relative
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      
      // Check if file exists
      await fs.access(resolvedPath);
      
      // Read file
      const content = await fs.readFile(resolvedPath, 'utf8');
      return content;
    } catch (error) {
      throw new IOError(`Failed to read file ${filePath}: ${error}`);
    }
  }
}

/**
 * URL reader
 */
export class URLReader {
  constructor(private logger: Logger) {}

  /**
   * Read HTML from URL
   */
  async read(url: string): Promise<string> {
    try {
      // Add protocol if missing
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Fetch URL
      const response = await got(normalizedUrl);
      return response.body;
    } catch (error) {
      throw new IOError(`Failed to fetch URL ${url}: ${error}`);
    }
  }
}
