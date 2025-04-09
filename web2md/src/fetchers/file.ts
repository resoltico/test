/**
 * File Fetcher
 * 
 * Handles reading HTML content from local files.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get proper __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read HTML content from a file
 * 
 * @param filePath - Path to the HTML file
 * @returns The HTML content
 * @throws Error if the file cannot be read
 */
export async function readFromFile(filePath: string): Promise<string> {
  try {
    // Resolve the file path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    
    // Check if the file exists
    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`File doesn't exist or is not readable: ${filePath}`);
    }
    
    // Read the file
    const content = await fs.readFile(absolutePath, 'utf8');
    
    // Basic check to ensure the content is likely HTML
    if (!isLikelyHtml(content)) {
      throw new Error(`File does not appear to contain HTML: ${filePath}`);
    }
    
    return content;
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to read file: ${error.message}`);
    } else {
      throw new Error('Failed to read file: Unknown error');
    }
  }
}

/**
 * Check if content is likely HTML
 * 
 * @param content - The content to check
 * @returns true if the content appears to be HTML
 */
function isLikelyHtml(content: string): boolean {
  // Very basic check - look for common HTML tags
  const htmlPatterns = [
    /<html[^>]*>/i,
    /<body[^>]*>/i,
    /<div[^>]*>/i,
    /<p[^>]*>/i,
    /<h[1-6][^>]*>/i,
    /<script[^>]*>/i,
    /<style[^>]*>/i,
    /<a[^>]*>/i
  ];
  
  // If content matches any of the patterns, it's likely HTML
  return htmlPatterns.some(pattern => pattern.test(content));
}