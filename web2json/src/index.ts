// Main entry point for web2json

// Re-export core functionality
export { parseDocument } from './parser.js';
export { fetchFromUrl, fetchFromFile, parseHtml } from './fetcher.js';

// Re-export types and schemas
export * from './schema/index.js';

// Re-export utilities
export * from './utils/index.js';

// Re-export processors
export * from './processors/index.js';

// Re-export CLI functionality
export { createCli } from './cli.js';

// Import necessary modules for programmatic API
import fs from 'node:fs/promises';
import { fetchFromUrl, fetchFromFile, parseHtml } from './fetcher.js';
import { parseDocument } from './parser.js';
import { formatJson } from './utils/json.js';
import { resolveOutputPath } from './utils/path.js';
import { logger } from './utils/logger.js';

/**
 * Convert a URL to JSON
 */
export async function convertUrlToJson(
  url: string, 
  outputPath?: string
): Promise<string> {
  logger.info(`Converting URL to JSON: ${url}`);
  
  // Fetch HTML from URL
  const html = await fetchFromUrl(url);
  
  // Convert to JSON
  return convertHtmlToJson(html, url, outputPath);
}

/**
 * Convert a local HTML file to JSON
 */
export async function convertFileToJson(
  filePath: string, 
  outputPath?: string
): Promise<string> {
  logger.info(`Converting file to JSON: ${filePath}`);
  
  // Read HTML from file
  const html = await fetchFromFile(filePath);
  
  // Convert to JSON
  return convertHtmlToJson(html, filePath, outputPath);
}

/**
 * Convert HTML content to JSON
 */
async function convertHtmlToJson(
  html: string, 
  sourcePath: string, 
  outputPath?: string
): Promise<string> {
  // Parse HTML
  const dom = parseHtml(html);
  
  // Convert to JSON structure
  const jsonData = parseDocument(dom);
  
  // Format JSON
  const jsonOutput = formatJson(jsonData);
  
  // Write to file if output path is provided
  if (outputPath) {
    // Resolve output path
    const fullOutputPath = await resolveOutputPath(sourcePath, outputPath);
    
    // Write JSON file
    await fs.writeFile(fullOutputPath, jsonOutput, 'utf-8');
    
    logger.success(`JSON saved to: ${fullOutputPath}`);
  }
  
  return jsonOutput;
}
