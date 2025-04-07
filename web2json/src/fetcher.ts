import { got } from 'got';
import fs from 'node:fs/promises';
import { createDOM } from './utils/html.js';
import { logger } from './utils/logger.js';

/**
 * Fetch HTML content from a URL
 */
export async function fetchFromUrl(url: string): Promise<string> {
  try {
    logger.info(`Fetching content from URL: ${url}`);
    
    const response = await got(url, {
      timeout: {
        request: 30000 // 30 second timeout
      },
      headers: {
        'User-Agent': 'web2json/1.0 Node.js/22.0'
      }
    });
    
    logger.success(`Successfully fetched content (${response.body.length} bytes)`);
    return response.body;
  } catch (error) {
    logger.error(`Failed to fetch URL: ${url}`, error as Error);
    throw new Error(`Failed to fetch URL: ${url}`);
  }
}

/**
 * Read HTML content from a local file
 */
export async function fetchFromFile(filePath: string): Promise<string> {
  try {
    logger.info(`Reading content from file: ${filePath}`);
    
    const content = await fs.readFile(filePath, { encoding: 'utf-8' });
    
    logger.success(`Successfully read file (${content.length} bytes)`);
    return content;
  } catch (error) {
    logger.error(`Failed to read file: ${filePath}`, error as Error);
    throw new Error(`Failed to read file: ${filePath}`);
  }
}

/**
 * Parse HTML content and create a JSDOM instance
 */
export function parseHtml(html: string) {
  try {
    logger.info('Parsing HTML content');
    
    const dom = createDOM(html);
    
    logger.success('Successfully parsed HTML');
    return dom;
  } catch (error) {
    logger.error('Failed to parse HTML content', error as Error);
    throw new Error('Failed to parse HTML content');
  }
}
