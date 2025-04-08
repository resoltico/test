import fs from 'node:fs/promises';
import { got } from 'got';
import { isUrl, fileExists, withRetry } from './utils.js';

/**
 * Fetches HTML content from a URL or local file
 * @param {string} source - The URL or file path to fetch HTML from
 * @param {object} options - Options for fetching
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<string>} - The HTML content
 */
export async function fetchHtml(source, options = {}) {
  const { timeout = 30000, maxRetries = 3 } = options;
  
  try {
    if (isUrl(source)) {
      // Fetch HTML from URL with retry capability
      return await withRetry(
        async () => {
          const response = await got(source, {
            timeout: { request: timeout },
            retry: { limit: 0 }, // We handle retries ourselves
          });
          return response.body;
        },
        { maxRetries }
      );
    } else {
      // Check if the file exists
      const exists = await fileExists(source);
      if (!exists) {
        throw new Error(`File not found: ${source}`);
      }
      
      // Read HTML from local file
      return await fs.readFile(source, 'utf-8');
    }
  } catch (error) {
    throw new Error(`Failed to fetch HTML: ${error.message}`);
  }
}

/**
 * Fetches HTML content with metadata
 * @param {string} source - The URL or file path to fetch HTML from
 * @param {object} options - Options for fetching
 * @returns {Promise<object>} - The HTML content and metadata
 */
export async function fetchHtmlWithMetadata(source, options = {}) {
  const html = await fetchHtml(source, options);
  
  let metadata = {};
  if (isUrl(source)) {
    const url = new URL(source);
    metadata = {
      source,
      hostname: url.hostname,
      pathname: url.pathname,
      protocol: url.protocol,
    };
  } else {
    metadata = {
      source,
      isLocalFile: true,
    };
  }
  
  return { html, metadata };
}