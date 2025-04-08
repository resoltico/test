// Main entry point for web2json library

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
import { formatJson, validateJsonStructure, cleanupJson } from './utils/json.js';
import { resolveOutputPath } from './utils/path.js';
import { logger } from './utils/logger.js';

/**
 * Options for HTML-to-JSON conversion
 */
export interface ConversionOptions {
  /** Output path for saving the JSON file (optional) */
  outputPath?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Skip validation of the resulting JSON structure */
  skipValidation?: boolean;
  /** Preserve original HTML formatting in content fields */
  preserveHtml?: boolean;
}

/**
 * Result of an HTML-to-JSON conversion
 */
export interface ConversionResult {
  /** The parsed document as a JSON object */
  document: any;
  /** The formatted JSON string */
  json: string;
  /** The output path if saved to file */
  outputPath?: string;
}

/**
 * Convert a URL to JSON
 */
export async function convertUrlToJson(
  url: string, 
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  if (options.debug) {
    logger.enableDebug();
  }
  
  logger.info(`Converting URL to JSON: ${url}`);
  
  // Fetch HTML from URL
  const html = await fetchFromUrl(url);
  
  // Convert to JSON
  return convertHtmlToJson(html, url, options);
}

/**
 * Convert a local HTML file to JSON
 */
export async function convertFileToJson(
  filePath: string, 
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  if (options.debug) {
    logger.enableDebug();
  }
  
  logger.info(`Converting file to JSON: ${filePath}`);
  
  // Read HTML from file
  const html = await fetchFromFile(filePath);
  
  // Convert to JSON
  return convertHtmlToJson(html, filePath, options);
}

/**
 * Convert HTML string to JSON
 */
export async function convertHtmlStringToJson(
  html: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  if (options.debug) {
    logger.enableDebug();
  }
  
  logger.info('Converting HTML string to JSON');
  
  // Use a placeholder source path
  const sourcePath = 'html-string-' + Date.now();
  
  // Convert to JSON
  return convertHtmlToJson(html, sourcePath, options);
}

/**
 * Convert HTML content to JSON
 */
async function convertHtmlToJson(
  html: string, 
  sourcePath: string, 
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  // Parse HTML
  const dom = parseHtml(html);
  
  // Convert to JSON structure
  let document = parseDocument(dom);
  
  // Clean up the JSON structure
  document = cleanupJson(document);
  
  // Validate JSON if not skipped
  if (!options.skipValidation) {
    if (!validateJsonStructure(document)) {
      throw new Error('Generated JSON structure is invalid');
    }
  }
  
  // Format JSON
  const json = formatJson(document);
  
  // Prepare result
  const result: ConversionResult = { 
    document, 
    json 
  };
  
  // Write to file if output path is provided
  if (options.outputPath) {
    // Resolve output path
    const fullOutputPath = await resolveOutputPath(sourcePath, options.outputPath);
    
    // Write JSON file
    await fs.writeFile(fullOutputPath, json, 'utf-8');
    
    logger.success(`JSON saved to: ${fullOutputPath}`);
    result.outputPath = fullOutputPath;
  }
  
  return result;
}
