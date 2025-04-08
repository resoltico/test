import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Sanitizes a filename by removing or replacing invalid characters
 * @param {string} filename - The filename to sanitize
 * @returns {string} - The sanitized filename
 */
export function sanitizeFilename(filename) {
  // Replace invalid characters with underscores
  return filename
    .replace(/[/\\?%*:|"<>]/g, '_') // Remove characters not allowed in filenames
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/^\.+/, '')            // Remove leading dots
    .replace(/\.+$/, '')            // Remove trailing dots
    .trim();
}

/**
 * Determines the output path for a given input URL or file
 * @param {string} input - The input URL or file path
 * @param {string} outputDir - Optional output directory
 * @returns {string} - The output file path
 */
export async function determineOutputPath(input, outputDir = '.') {
  let filename;
  
  try {
    // Check if input is a URL
    const url = new URL(input);
    // Extract hostname and pathname to create a reasonable filename
    const hostname = url.hostname.replace(/^www\./, '');
    const pathname = url.pathname.replace(/\/$/, '');
    
    // Create a filename based on the URL
    filename = sanitizeFilename(`${hostname}${pathname}`);
    if (!filename.endsWith('.md')) {
      filename += '.md';
    }
  } catch (error) {
    // Input is not a URL, treat as a local file
    const inputPath = path.resolve(input);
    const basename = path.basename(inputPath, path.extname(inputPath));
    filename = sanitizeFilename(basename) + '.md';
  }
  
  // Ensure the output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  return path.join(outputDir, filename);
}

/**
 * Checks if a string is a valid URL
 * @param {string} str - The string to check
 * @returns {boolean} - True if the string is a valid URL, false otherwise
 */
export function isUrl(str) {
  try {
    new URL(str);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Determines if a file exists
 * @param {string} filePath - The path to the file
 * @returns {Promise<boolean>} - True if the file exists, false otherwise
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the directory name of the current module
 * @returns {string} - The directory name
 */
export function getDirname() {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {object} options - Options for retrying
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in milliseconds (default: 1000)
 * @returns {Promise<any>} - The result of the function
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, initialDelay = 1000 } = options;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Safely writes a file with atomic guarantees
 * @param {string} filePath - The path to write to
 * @param {string|Buffer} content - The content to write
 * @returns {Promise<void>}
 */
export async function safeWriteFile(filePath, content) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, content);
  await fs.rename(tempPath, filePath);
}