/**
 * Path utilities for working with file paths
 */
import path from 'node:path';
import { toValidFilename } from './string-utils.js';

/**
 * Determines the output path for a converted file
 * @param sourcePath The source path (file or URL)
 * @param isUrl Whether the source is a URL or a file
 * @param outputPath The optional output path specified by the user
 * @returns The resolved output path
 */
export function determineOutputPath(
  sourcePath: string, 
  isUrl: boolean, 
  outputPath?: string
): string {
  // If output path is provided, use it
  if (outputPath) {
    return outputPath;
  }
  
  if (isUrl) {
    // For URLs, create a filename based on the URL
    const filename = toValidFilename(sourcePath);
    // Ensure it has a .md extension
    const withExtension = filename.endsWith('.md') ? filename : `${filename}.md`;
    return path.join(process.cwd(), withExtension);
  } else {
    // For files, replace the extension with .md
    const parsed = path.parse(sourcePath);
    parsed.ext = '.md';
    parsed.base = '';
    return path.format(parsed);
  }
}

/**
 * Resolves a path relative to the current working directory
 * @param relativePath The path to resolve
 * @returns The absolute path
 */
export function resolvePathFromCwd(relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(process.cwd(), relativePath);
}

/**
 * Gets the built-in rules directory path
 * @returns The path to the built-in rules directory
 */
export function getBuiltInRulesPath(): string {
  // During development, rules are in the project root
  // In production, they're in the package directory
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    return path.resolve(process.cwd(), 'rules');
  }
  
  // In production, find the package root
  const packageDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../..'
  );
  return path.join(packageDir, 'rules');
}
