import { parseHtml, documentToJson, ParserOptions } from './parser/index.js';
import { fetchHtml, FetchOptions } from './utils/fetch.js';
import { saveToFile } from './utils/file.js';
import { logger, LogLevel } from './utils/logger.js';
import { DocumentSchema } from './models/document.js';
import path from 'node:path';

export interface ConversionOptions extends ParserOptions {
  fetchOptions?: FetchOptions;
  outputPath?: string;
  logLevel?: LogLevel;
}

const defaultOptions: ConversionOptions = {
  fetchOptions: {},
  logLevel: LogLevel.INFO
};

/**
 * Convert a URL to a JSON file
 * 
 * @param url The URL to convert
 * @param options Conversion options
 * @returns The path to the generated JSON file
 */
export async function convertUrlToJson(url: string, options: ConversionOptions = {}): Promise<string> {
  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Set log level
  logger.setLevel(mergedOptions.logLevel || LogLevel.INFO);
  
  logger.info(`Converting URL to JSON: ${url}`);
  
  try {
    // Fetch HTML from URL
    const html = await fetchHtml(url, mergedOptions.fetchOptions);
    
    // Parse HTML to document structure
    const document = await parseHtml(html, mergedOptions);
    
    // Determine output path
    let outputPath = mergedOptions.outputPath;
    if (!outputPath) {
      // Generate a filename from the URL
      const urlObj = new URL(url);
      const filename = `${urlObj.hostname}${urlObj.pathname.replace(/\//g, '_')}`;
      outputPath = path.join(process.cwd(), `${filename}.json`);
    }
    
    // Convert document to JSON
    const json = documentToJson(document);
    
    // Save JSON to file
    await saveToFile(outputPath, json);
    
    logger.success(`Successfully converted URL to JSON: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error(`Failed to convert URL to JSON: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Convert HTML string to JSON
 * 
 * @param html The HTML string to convert
 * @param options Conversion options
 * @returns The JSON string
 */
export async function convertHtmlToJson(html: string, options: ConversionOptions = {}): Promise<string> {
  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Set log level
  logger.setLevel(mergedOptions.logLevel || LogLevel.INFO);
  
  logger.info('Converting HTML to JSON');
  
  try {
    // Parse HTML to document structure
    const document = await parseHtml(html, mergedOptions);
    
    // Convert document to JSON
    const json = documentToJson(document);
    
    // Save JSON to file if output path provided
    if (mergedOptions.outputPath) {
      await saveToFile(mergedOptions.outputPath, json);
      logger.success(`Successfully saved JSON to: ${mergedOptions.outputPath}`);
    }
    
    logger.success('Successfully converted HTML to JSON');
    return json;
  } catch (error) {
    logger.error(`Failed to convert HTML to JSON: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Convert a parsed document object to JSON
 * 
 * @param document The document object to convert
 * @param outputPath Optional path to save JSON file
 * @returns The JSON string
 */
export async function convertDocumentToJson(document: DocumentSchema, outputPath?: string): Promise<string> {
  logger.info('Converting document to JSON');
  
  try {
    // Convert document to JSON
    const json = documentToJson(document);
    
    // Save JSON to file if output path provided
    if (outputPath) {
      await saveToFile(outputPath, json);
      logger.success(`Successfully saved JSON to: ${outputPath}`);
    }
    
    logger.success('Successfully converted document to JSON');
    return json;
  } catch (error) {
    logger.error(`Failed to convert document to JSON: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export { parseHtml, documentToJson, LogLevel };
