/**
 * HTTP adapter implementation
 */
import got from 'got';
import { NetworkError } from '../../../shared/errors/index.js';
import { HttpInterface } from '../types.js';
import { Logger } from '../../../types.js';

/**
 * Implementation of HTTP operations
 */
export class HttpAdapter implements HttpInterface {
  constructor(private logger: Logger) {}
  
  /**
   * Fetches content from a URL
   */
  async fetchUrl(url: string): Promise<string> {
    try {
      this.logger.debug(`Fetching URL: ${url}`);
      
      const response = await got(url);
      return response.body;
    } catch (error) {
      throw new NetworkError(`Failed to fetch URL ${url}: ${(error as Error).message}`, url);
    }
  }
}
