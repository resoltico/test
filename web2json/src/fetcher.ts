import { got } from 'got';
import fs from 'node:fs/promises';
import { createDOM } from './utils/html.js';
import { logger } from './utils/logger.js';

/**
 * Fetch HTML content from a URL with robust error handling and timeouts
 */
export async function fetchFromUrl(url: string): Promise<string> {
  try {
    logger.info(`Fetching content from URL: ${url}`);
    
    const response = await got(url, {
      timeout: {
        request: 30000, // 30 second timeout
        response: 30000
      },
      retry: {
        limit: 3, // Retry up to 3 times
        methods: ['GET'],
        statusCodes: [408, 429, 500, 502, 503, 504]
      },
      headers: {
        'User-Agent': 'web2json/1.0 Node.js/22.0 (https://github.com/yourusername/web2json)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      followRedirect: true,
      decompress: true // Handle gzip/deflate automatically
    });
    
    // Log response info
    logger.debug(`Response status: ${response.statusCode}`);
    logger.debug(`Content type: ${response.headers['content-type']}`);
    logger.success(`Successfully fetched content (${response.body.length} bytes)`);
    
    return response.body;
  } catch (error) {
    // Enhanced error handling with more detailed information
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch URL: ${url}`, error as Error);
    
    // Provide more specific error messages based on error type
    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      throw new Error(`Request to ${url} timed out. The server might be slow or unreachable.`);
    } else if (errorMessage.includes('ENOTFOUND')) {
      throw new Error(`Could not resolve the domain in ${url}. Please check the URL for typos.`);
    } else if (errorMessage.includes('403')) {
      throw new Error(`Access forbidden to ${url}. The website might be blocking automated access.`);
    } else if (errorMessage.includes('404')) {
      throw new Error(`Page not found at ${url}. Please check that the URL is correct.`);
    }
    
    throw new Error(`Failed to fetch URL: ${url} - ${errorMessage}`);
  }
}

/**
 * Read HTML content from a local file with improved error handling
 */
export async function fetchFromFile(filePath: string): Promise<string> {
  try {
    logger.info(`Reading content from file: ${filePath}`);
    
    // Check if file exists before trying to read it
    try {
      await fs.access(filePath);
    } catch (e) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file with proper encoding detection
    const content = await fs.readFile(filePath, { encoding: 'utf-8' });
    
    // Basic validation of HTML content
    if (!content.includes('<html') && !content.includes('<!DOCTYPE')) {
      logger.warning(`File ${filePath} might not be valid HTML (missing doctype/html tag)`);
    }
    
    logger.success(`Successfully read file (${content.length} bytes)`);
    return content;
  } catch (error) {
    logger.error(`Failed to read file: ${filePath}`, error as Error);
    
    // More descriptive error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('ENOENT')) {
      throw new Error(`File not found: ${filePath}. Please check that the path is correct.`);
    } else if (errorMessage.includes('EACCES')) {
      throw new Error(`Permission denied when trying to read ${filePath}.`);
    }
    
    throw new Error(`Failed to read file: ${filePath} - ${errorMessage}`);
  }
}

/**
 * Parse HTML content and create a JSDOM instance with careful error handling
 */
export function parseHtml(html: string) {
  try {
    logger.info('Parsing HTML content');
    
    if (!html || html.trim().length === 0) {
      throw new Error('HTML content is empty');
    }
    
    // Create DOM with enhanced error handling
    const dom = createDOM(html);
    
    // Basic validation of the parsed document
    const document = dom.window.document;
    if (!document.documentElement) {
      throw new Error('Parsed HTML does not contain a valid document element');
    }
    
    logger.success('Successfully parsed HTML');
    return dom;
  } catch (error) {
    logger.error('Failed to parse HTML content', error as Error);
    
    // Provide more context about parsing errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('empty')) {
      throw new Error('HTML content is empty or could not be read');
    } else if (errorMessage.includes('syntax')) {
      throw new Error('HTML contains syntax errors that prevented parsing');
    }
    
    throw new Error(`Failed to parse HTML content: ${errorMessage}`);
  }
}
