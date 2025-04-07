// Main module entry point for web2json

// Re-export the main functionality
export { parseDocument } from './parser.js';
export { fetchFromUrl, fetchFromFile, parseHtml } from './fetcher.js';
export * from './schema/index.js';
export * from './utils/index.js';
export * from './processors/index.js';

// Export the CLI functionality
export { createCli } from './cli.js';

// Provide a programmatic API for direct use
import fs from 'node:fs/promises';
import { fetchFromUrl, fetchFromFile, parseHtml } from './fetcher.js';
import { parseDocument } from './parser.js';
import { formatJson } from './utils/json.js';
import { resolveOutputPath } from './utils/path.js';

/**
 * Convert a URL to JSON
 */
export async function convertUrlToJson(
  url: string, 
  outputPath?: string
): Promise<string> {
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
    // Resolve the full output path
    const fullOutputPath = await resolveOutputPath(sourcePath, outputPath);
    
    // Write the JSON file
    await fs.writeFile(fullOutputPath, jsonOutput, 'utf-8');
  }
  
  return jsonOutput;
}
