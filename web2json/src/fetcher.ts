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
    // Handle various error cases without using got's error types directly
    if (error instanceof Error) {
      const errorName = error.name;
      if (errorName === 'RequestError') {
        throw new Error(`Network error: ${error.message}`);
      } else if (errorName === 'HTTPError') {
        // Cast error to any to access response property
        const httpError = error as any;
        throw new Error(`HTTP error ${httpError.response?.statusCode}: ${error.message}`);
      } else if (errorName === 'TimeoutError') {
        throw new Error('Request timed out');
      } else if (errorName === 'MaxRedirectsError') {
        throw new Error('Too many redirects');
      } else {
        throw new Error(`Error fetching URL: ${error.message}`);
      }
    } else {
      throw new Error(`Error fetching URL: Unknown error`);
    }
  }
}