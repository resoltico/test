import { logger } from './logger.js';
import { setTimeout } from 'node:timers/promises';
import { URL } from 'node:url';

export interface FetchOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

const defaultOptions: FetchOptions = {
  retries: 3,
  retryDelay: 1000,
  timeout: 30000,
  headers: {
    'User-Agent': 'web2json/1.0.0 (Node.js)'
  }
};

export async function fetchHtml(url: string, options: FetchOptions = {}): Promise<string> {
  const mergedOptions = { ...defaultOptions, ...options };
  const { retries, retryDelay, timeout, headers } = mergedOptions;

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < (retries as number) + 1) {
    try {
      logger.debug(`Fetching URL (attempt ${attempt + 1}): ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(timeout as number, () => {
        controller.abort();
      });

      const response = await fetch(url, {
        headers: headers as HeadersInit,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        logger.warn(`Content type is not HTML: ${contentType}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn(`Fetch attempt ${attempt + 1} failed: ${lastError.message}`);
      
      if (attempt < (retries as number)) {
        logger.debug(`Retrying in ${retryDelay}ms...`);
        await setTimeout(retryDelay as number);
      }
      
      attempt++;
    }
  }

  throw lastError as Error;
}
