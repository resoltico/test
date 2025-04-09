/**
 * Path Utilities
 * 
 * Provides utilities for handling file paths securely.
 */

import path from 'path';

/**
 * Sanitize a file path to prevent directory traversal attacks
 * 
 * @param unsafePath - The potentially unsafe file path
 * @returns A sanitized file path
 */
export function sanitizePath(unsafePath: string): string {
  // Normalize the path to resolve '..' and '.' segments
  const normalizedPath = path.normalize(unsafePath);
  
  // Ensure the path doesn't contain any null bytes
  if (normalizedPath.includes('\0')) {
    throw new Error('Invalid path: contains null bytes');
  }
  
  // In absolute paths, check for directory traversal attempts
  if (path.isAbsolute(normalizedPath)) {
    const rootDir = path.parse(normalizedPath).root;
    const relativePart = path.relative(rootDir, normalizedPath);
    
    // Check if the path tries to traverse outside the root
    if (relativePart.startsWith('..')) {
      throw new Error('Invalid path: directory traversal detected');
    }
  }
  
  return normalizedPath;
}

/**
 * Get the default output path for a Markdown file based on an input path
 * 
 * @param inputPath - The input file or URL path
 * @returns A default output path
 */
export function getDefaultOutputPath(inputPath: string): string {
  let baseName: string;
  
  if (inputPath.startsWith('http://') || inputPath.startsWith('https://')) {
    // For URLs, use the hostname and path
    try {
      const url = new URL(inputPath);
      const hostname = url.hostname;
      
      // Create a filename from the hostname and path
      let pathStr = url.pathname;
      if (pathStr === '/' || pathStr === '') {
        pathStr = '/index';
      }
      
      // Clean up the path for use as a filename
      pathStr = pathStr.replace(/\//g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
      if (pathStr.endsWith('.html')) {
        pathStr = pathStr.slice(0, -5);
      }
      
      baseName = `${hostname}${pathStr}`;
    } catch (error) {
      // Fallback in case of URL parsing error
      baseName = 'web2md-output';
    }
  } else {
    // For files, use the file name without extension
    const parsedPath = path.parse(inputPath);
    baseName = parsedPath.name; // Name without extension
  }
  
  // Return the base name with .md extension
  return `${baseName}.md`;
}