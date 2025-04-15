import got from 'got';
import { Logger } from '../../shared/logger/index.js';

export class URLReader {
  constructor(private logger: Logger) {}
  
  /**
   * Read content from a URL
   */
  async read(url: string): Promise<string> {
    try {
      this.logger.debug(`Fetching URL: ${url}`);
      
      const response = await got(url);
      const content = response.body;
      
      this.logger.debug(`Fetched ${content.length} bytes from URL`);
      
      return content;
    } catch (error) {
      throw new Error(`Failed to fetch URL '${url}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}