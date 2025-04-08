import path from 'path';
import fs from 'fs/promises';
import { URL } from 'url';
import os from 'os';

/**
 * Expands the tilde character in a path to the user's home directory
 * @param filePath The file path that may contain a tilde
 * @returns The expanded file path
 */
export function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace(/^~(?=$|\/|\\)/, os.homedir());
  }
  return filePath;
}

/**
 * Sanitizes a filename (not the full path) by replacing invalid characters
 * @param filename The filename to sanitize
 * @returns The sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Replace invalid filename characters with underscores
  return filename.replace(/[<>:"|?*]/g, '_');
}

/**
 * Sanitizes a file path by preserving path structure but replacing invalid characters in each segment
 * @param filePath The file path to sanitize
 * @returns The sanitized file path
 */
export function sanitizePath(filePath: string): string {
  // First expand any tilde in the path
  const expandedPath = expandTilde(filePath);
  
  // Split the path into directory and filename
  const dir = path.dirname(expandedPath);
  const filename = path.basename(expandedPath);
  
  // Sanitize the filename part only
  const sanitizedFilename = sanitizeFilename(filename);
  
  // Rejoin the path
  return path.join(dir, sanitizedFilename);
}

/**
 * Determines the output path for the Markdown file
 * @param inputSource The source URL or file path
 * @param outputPath Optional output path provided by the user
 * @returns The determined output path
 */
export async function determineOutputPath(inputSource: string, outputPath?: string): Promise<string> {
  if (outputPath) {
    const sanitizedPath = sanitizePath(outputPath);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(sanitizedPath);
    await fs.mkdir(dir, { recursive: true });
    
    // If the output path doesn't have an extension, add .md
    if (!path.extname(sanitizedPath)) {
      return `${sanitizedPath}.md`;
    }
    
    return sanitizedPath;
  }

  let fileName: string;
  
  if (inputSource.startsWith('http://') || inputSource.startsWith('https://')) {
    // Extract filename from URL
    try {
      const url = new URL(inputSource);
      fileName = url.pathname.split('/').pop() || url.hostname;
      
      // If the pathname ends with a slash, use the hostname
      if (fileName === '' || fileName === '/') {
        fileName = url.hostname;
      }
      
      // Remove file extension if exists
      fileName = fileName.replace(/\.\w+$/, '');
    } catch (error) {
      // If URL parsing fails, use a fallback name
      fileName = 'webpage';
    }
  } else {
    // Extract filename from local path
    fileName = path.basename(inputSource, path.extname(inputSource));
  }
  
  const sanitizedFileName = sanitizeFilename(fileName);
  const outputFile = `${sanitizedFileName}.md`;
  
  return outputFile;
}
