// src/index.ts
import { fetchHtml } from './fetcher.js';
import { parseHtml } from './parser.js';
import { writeJsonToFile } from './utils/json.js';
import { logger } from './utils/logger.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { Document } from './schema/document.js';

/**
 * Process a URL and convert to JSON
 */
export async function processUrl(url: string, outputPath: string): Promise<void> {
  logger.startSpinner(`Processing URL: ${url}`);
  
  try {
    // Fetch HTML content
    logger.updateSpinner(`Fetching HTML from ${url}...`);
    const html = await fetchHtml(url);
    
    // Parse HTML to structured JSON
    logger.updateSpinner('Parsing HTML to structured JSON...');
    const document = await parseHtml(html, url);
    
    // Write to output file
    logger.updateSpinner(`Writing JSON to ${outputPath}...`);
    await writeJsonToFile(outputPath, document);
    
    logger.stopSpinner(true, `Successfully processed ${url}`);
  } catch (error) {
    logger.stopSpinner(false, `Failed to process ${url}`);
    throw error;
  }
}

/**
 * Process a local HTML file and convert to JSON
 */
export async function processFile(filePath: string, outputPath: string): Promise<void> {
  logger.startSpinner(`Processing file: ${filePath}`);
  
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file content
    logger.updateSpinner(`Reading file ${filePath}...`);
    const html = await readFile(filePath, 'utf-8');
    
    // Parse HTML to structured JSON
    logger.updateSpinner('Parsing HTML to structured JSON...');
    const document = await parseHtml(html);
    
    // Write to output file
    logger.updateSpinner(`Writing JSON to ${outputPath}...`);
    await writeJsonToFile(outputPath, document);
    
    logger.stopSpinner(true, `Successfully processed ${filePath}`);
  } catch (error) {
    logger.stopSpinner(false, `Failed to process ${filePath}`);
    throw error;
  }
}

/**
 * Export document schema for external use
 */
export type { Document };
