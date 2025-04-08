import path from 'node:path';
import fs from 'node:fs/promises';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import { logger } from './logger.js';

/**
 * Sanitizes a filename by removing invalid characters
 * This ensures we create valid filenames across platforms
 */
export function sanitizeFilename(input: string): string {
  // Replace invalid filename characters with underscores
  return input
    .replace(/[<>:"/\\|?*]/g, '_') // Invalid chars on most filesystems
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/^\.+/, '')           // Remove leading dots
    .replace(/\.+$/, '')           // Remove trailing dots
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .trim();
}

/**
 * Generates an output filename from a URL or file path
 * This creates a deterministic, clean filename for any input
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
  
  // Sanitize the basename
  const sanitized = sanitizeFilename(basename);
  
  // If the sanitized name is too long (>100 chars), hash part of it
  if (sanitized.length > 100) {
    const prefix = sanitized.substring(0, 50);
    const suffix = sanitized.substring(sanitized.length - 30);
    const middle = sanitized.substring(50, sanitized.length - 30);
    
    // Create a short hash of the middle part
    const hash = crypto.createHash('md5').update(middle).digest('hex').substring(0, 8);
    
    // Combine parts with the hash
    basename = `${prefix}_${hash}_${suffix}`;
  } else {
    basename = sanitized;
  }
  
  // Ensure the filename ends with .json
  return `${basename}.json`;
}

/**
 * Ensures the output directory exists, creating it if necessary
 */
export async function ensureOutputDir(dirPath: string): Promise<void> {
  try {
    // Check if the directory exists
    await fs.access(dirPath);
    logger.debug(`Output directory exists: ${dirPath}`);
  } catch (e) {
    // Directory doesn't exist, create it recursively
    logger.info(`Creating output directory: ${dirPath}`);
    await fs.mkdir(dirPath, { recursive: true });
    logger.success(`Created output directory: ${dirPath}`);
  }
}

/**
 * Resolves the output path for the converted file
 * This handles both URL and file inputs
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
  const outputPath = path.join(directory, filename);
  logger.debug(`Resolved output path: ${outputPath}`);
  
  return outputPath;
}

/**
 * Checks if a file exists and creates a numbered version if it does
 * This avoids overwriting existing files
 */
export async function ensureUniqueFilePath(filePath: string): Promise<string> {
  try {
    // Check if the file exists
    await fs.access(filePath);
    
    // File exists, create a numbered version
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    
    let counter = 1;
    let newPath: string;
    
    // Try numbered versions until we find one that doesn't exist
    do {
      newPath = path.join(dir, `${base}_${counter}${ext}`);
      counter++;
      
      try {
        await fs.access(newPath);
        // File exists, continue loop to try next number
      } catch (e) {
        // File doesn't exist, we can use this path
        return newPath;
      }
    } while (counter < 1000); // Limit to prevent infinite loop
    
    // If we get here, just use a timestamp
    return path.join(dir, `${base}_${Date.now()}${ext}`);
  } catch (e) {
    // File doesn't exist, we can use the original path
    return filePath;
  }
}

/**
 * Calculates a stable hash for a string
 * Useful for generating IDs from content
 */
export function stableHash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}