import fs from 'fs/promises';
import { FetchError } from '../utils/error-utils.js';

/**
 * Fetches HTML content from a local file
 * @param filePath Path to the local HTML file
 * @returns The HTML content as a string
 * @throws {FetchError} If reading fails
 */
export async function fetchFromFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new FetchError(`Failed to read HTML from file: ${filePath}`, { cause: error });
  }
}
