import { fetchHtml, fetchHtmlWithMetadata } from './fetcher.js';
import { convertHtmlToMarkdown, convertHtmlToMarkdownWithSchema } from './converter.js';
import { determineOutputPath, safeWriteFile } from './utils.js';
import { loadSchema } from './schema-loader.js';
import fs from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

// Define custom error class for web2md
export class Web2MdError extends Error {
  static errorCodes = {
    FETCH_ERROR: 'FETCH_ERROR',
    CONVERSION_ERROR: 'CONVERSION_ERROR',
    OUTPUT_ERROR: 'OUTPUT_ERROR',
    FILE_EXISTS_ERROR: 'FILE_EXISTS_ERROR',
    SCHEMA_ERROR: 'SCHEMA_ERROR',
  };
  
  constructor(message, options = {}) {
    super(message);
    const { code, cause, metadata } = options;
    this.code = code;
    this.cause = cause;
    this.metadata = metadata;
    this.name = 'Web2MdError';
  }
}

/**
 * Converts HTML from a source URL or file to Markdown and saves it to a file
 * @param {string} source - The source URL or file path
 * @param {object} options - Options for the conversion
 * @param {string} options.outputDir - The output directory
 * @param {boolean} options.force - Whether to overwrite existing files
 * @param {number} options.timeout - Timeout in milliseconds
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {string} options.schema - Schema preset to use (standard, structured, clean, custom)
 * @param {string} options.schemaFile - Path to custom schema file (required if schema is 'custom')
 * @returns {Promise<string>} - The path to the output file
 */
export async function convertToMarkdown(source, options = {}) {
  const { 
    outputDir = '.', 
    force = false,
    timeout = 30000,
    maxRetries = 3,
    schema = 'standard',
    schemaFile = null
  } = options;
  
  try {
    // Fetch HTML content
    const { html, metadata } = await fetchHtmlWithMetadata(source, { timeout, maxRetries });
    
    // Load the conversion schema
    let schemaConfig;
    try {
      schemaConfig = await loadSchema(schema, schemaFile);
    } catch (error) {
      throw new Web2MdError(`Failed to load schema: ${error.message}`, {
        code: Web2MdError.errorCodes.SCHEMA_ERROR,
        cause: error,
        metadata: { schema, schemaFile }
      });
    }
    
    // Convert HTML to Markdown
    let markdown;
    if (schema === 'standard' && !schemaFile) {
      // Use the optimized default converter for standard schema
      markdown = convertHtmlToMarkdown(html);
    } else {
      // Use the schema-based converter for custom schemas
      markdown = convertHtmlToMarkdownWithSchema(html, schemaConfig);
    }
    
    // Determine output path
    const outputPath = await determineOutputPath(source, outputDir);
    
    // Check if the output file already exists
    try {
      await fs.access(outputPath);
      if (!force) {
        throw new Web2MdError(`Output file already exists: ${outputPath}`, {
          code: Web2MdError.errorCodes.FILE_EXISTS_ERROR,
          metadata: { outputPath }
        });
      }
    } catch (error) {
      // File doesn't exist, we can proceed
      if (error instanceof Web2MdError) {
        throw error;
      }
    }
    
    // Write the Markdown content to the output file
    await safeWriteFile(outputPath, markdown);
    
    return outputPath;
  } catch (error) {
    if (error instanceof Web2MdError) {
      throw error;
    }
    
    if (error.message && error.message.includes('Failed to fetch HTML')) {
      throw new Web2MdError(`Failed to fetch HTML from ${source}`, {
        code: Web2MdError.errorCodes.FETCH_ERROR,
        cause: error,
        metadata: { source }
      });
    }
    
    throw new Web2MdError(`Failed to convert ${source} to Markdown`, {
      code: Web2MdError.errorCodes.CONVERSION_ERROR,
      cause: error,
      metadata: { source }
    });
  }
}

/**
 * Converts HTML to Markdown with a custom schema configuration
 * @param {string} source - The source URL or file path
 * @param {object} options - Options for the conversion
 * @param {string} options.outputDir - The output directory
 * @param {boolean} options.force - Whether to overwrite existing files
 * @param {number} options.timeout - Timeout in milliseconds
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {object} options.schemaOptions - Custom schema options
 * @returns {Promise<string>} - The path to the output file
 */
export async function convertToMarkdownWithSchema(source, options = {}) {
  const {
    outputDir = '.',
    force = false,
    timeout = 30000,
    maxRetries = 3,
    schemaOptions = {}
  } = options;
  
  // Call the standard converter with schemaOptions
  return convertToMarkdown(source, {
    outputDir,
    force,
    timeout,
    maxRetries,
    schema: 'custom',
    schemaFile: null,
    schemaOptions
  });
}

/**
 * Batch converts multiple sources to Markdown
 * @param {string[]} sources - The source URLs or file paths
 * @param {object} options - Options for the conversion
 * @returns {Promise<object>} - The results of the conversions
 */
export async function batchConvert(sources, options = {}) {
  const results = {
    successful: [],
    failed: []
  };
  
  // Process sources concurrently with a limit
  const concurrencyLimit = options.concurrencyLimit || 3;
  const batches = [];
  
  for (let i = 0; i < sources.length; i += concurrencyLimit) {
    const batch = sources.slice(i, i + concurrencyLimit);
    
    const batchResults = await Promise.allSettled(
      batch.map(source => convertToMarkdown(source, options))
    );
    
    batchResults.forEach((result, index) => {
      const source = batch[index];
      
      if (result.status === 'fulfilled') {
        results.successful.push({
          source,
          outputPath: result.value
        });
      } else {
        results.failed.push({
          source,
          error: result.reason
        });
      }
    });
    
    // Add a small delay between batches to avoid overwhelming resources
    if (i + concurrencyLimit < sources.length) {
      await setTimeout(1000);
    }
  }
  
  return results;
}

export { fetchHtml, convertHtmlToMarkdown, convertHtmlToMarkdownWithSchema, determineOutputPath, loadSchema };