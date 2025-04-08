import got from 'got';
import { FetchError } from '../utils/error-utils.js';

/**
 * Fetches HTML content from a URL
 * @param url The URL to fetch HTML from
 * @returns The HTML content as a string
 * @throws {FetchError} If fetching fails
 */
export async function fetchFromUrl(url: string): Promise<string> {
  try {
    const response = await got(url);
    return response.body;
  } catch (error) {
    throw new FetchError(`Failed to fetch HTML from URL: ${url}`, { cause: error });
  }
}
