// src/fetcher.ts
import got from 'got';
import { URL } from 'url';
import { logger } from './utils/logger.js';

/**
 * Fetch HTML content from a URL
 */
export async function fetchHtml(url: string): Promise<string> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    
    // Log fetching status
    logger.info(`Fetching content from ${parsedUrl.toString()}`);
    
    // Use got to fetch the HTML content
    const response = await got(parsedUrl.toString(), {
      timeout: {
        request: 30000 // 30 seconds timeout
      },
      retry: {
        limit: 2
      },
      headers: {
        'User-Agent': 'web2json/1.0 (https://github.com/yourusername/web2json)'
      }
    });
    
    if (response.statusCode !== 200) {
      throw new Error(`HTTP error ${response.statusCode}: ${response.statusMessage}`);
    }
    
    // Return the HTML content
    return response.body;
  } catch (error) {
    // Handle various error cases
    if (error instanceof got.RequestError) {
      throw new Error(`Network error: ${error.message}`);
    } else if (error instanceof got.HTTPError) {
      throw new Error(`HTTP error ${error.response.statusCode}: ${error.message}`);
    } else if (error instanceof got.TimeoutError) {
      throw new Error('Request timed out');
    } else if (error instanceof got.MaxRedirectsError) {
      throw new Error('Too many redirects');
    } else {
      throw new Error(`Error fetching URL: ${(error as Error).message}`);
    }
  }
}
