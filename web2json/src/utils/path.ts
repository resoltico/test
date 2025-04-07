import path from 'node:path';
import fs from 'node:fs/promises';
import { URL } from 'node:url';

/**
 * Sanitizes a filename by removing invalid characters
 */
export function sanitizeFilename(input: string): string {
  // Replace invalid filename characters with underscores
  return input
    .replace(/[<>:"/\\|?*]/g, '_') // Invalid chars on most filesystems
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/^\.+/, '')           // Remove leading dots
    .replace(/\.+$/, '')           // Remove trailing dots
    .trim();
}

/**
 * Generates an output filename from a URL or file path
 */
export function generateOutputFilename(input: string): string {
  let basename: string;
  
  try {
    // Check if the input is a URL
    const url = new URL(input);
    // Use hostname + pathname as the base filename
    basename = `${url.hostname}${url.pathname}`;
    
    // Special case for root path
    if (basename.endsWith('/')) {
      basename += 'index';
    }
  } catch (e) {
    // Not a URL, treat as file path
    basename = path.basename(input, path.extname(input));
  }
  
  // Sanitize and ensure the filename ends with .json
  return `${sanitizeFilename(basename)}.json`;
}

/**
 * Ensures the output directory exists, creating it if necessary
 */
export async function ensureOutputDir(dirPath: string): Promise<void> {
  try {
    // Check if the directory exists
    await fs.access(dirPath);
  } catch (e) {
    // Directory doesn't exist, create it recursively
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Resolves the output path for the converted file
 */
export async function resolveOutputPath(
  input: string, 
  outputDir?: string
): Promise<string> {
  // Get the base output filename from the input
  const filename = generateOutputFilename(input);
  
  // Determine the output directory
  const directory = outputDir || process.cwd();
  
  // Ensure the output directory exists
  await ensureOutputDir(directory);
  
  // Return the full output path
  return path.join(directory, filename);
}
