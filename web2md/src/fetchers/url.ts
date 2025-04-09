/**
 * URL Fetcher
 * 
 * Handles fetching HTML content from URLs.
 */

import got from 'got';

/**
 * Fetch HTML content from a URL
 * 
 * @param url - The URL to fetch
 * @returns The HTML content
 * @throws Error if the URL cannot be fetched
 */
export async function fetchFromUrl(url: string): Promise<string> {
  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }
    
    // Fetch the URL with proper headers
    const response = await got(url, {
      headers: {
        'User-Agent': 'web2md/1.0.0 Node.js',
        'Accept': 'text/html',
      },
      timeout: {
        request: 30000, // 30 seconds timeout
      },
      retry: {
        limit: 2,       // Retry failed requests up to 2 times
      },
    });
    
    // Ensure we got HTML
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`URL did not return HTML content: ${contentType}`);
    }
    
    // Return the HTML content
    return response.body;
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch URL: ${error.message}`);
    } else {
      throw new Error('Failed to fetch URL: Unknown error');
    }
  }
}