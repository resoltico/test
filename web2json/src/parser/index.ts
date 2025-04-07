import * as cheerio from 'cheerio';
import fastJsonStringify from 'fast-json-stringify';
import { DocumentSchema, documentSchema } from '../models/document.js';
import { extractDocumentInfo } from './document.js';
import { buildSectionHierarchy } from './sections.js';
import { logger } from '../utils/logger.js';

export interface ParserOptions {
  preserveWhitespace?: boolean;
  decodeEntities?: boolean;
  ignoreInvalidHtml?: boolean;
  verbose?: boolean;
}

const defaultOptions: ParserOptions = {
  preserveWhitespace: false,
  decodeEntities: false,
  ignoreInvalidHtml: true,
  verbose: false
};

export async function parseHtml(html: string, options: ParserOptions = {}): Promise<DocumentSchema> {
  const mergedOptions = { ...defaultOptions, ...options };
  logger.debug('Starting HTML parsing');
  
  // Load HTML with Cheerio
  const $ = cheerio.load(html, {
    decodeEntities: mergedOptions.decodeEntities,
    normalizeWhitespace: !mergedOptions.preserveWhitespace,
    // XML mode to preserve original HTML content better
    xml: {
      xmlMode: false,
      decodeEntities: mergedOptions.decodeEntities
    }
  });
  
  // Document information
  const documentInfo = extractDocumentInfo($);
  
  // Extract body for content parsing
  const $body = $('body');
  if (!$body.length) {
    logger.warn('No <body> element found, using root element');
  }
  
  // Build section hierarchy
  const sections = buildSectionHierarchy($, $body.length ? $body : $.root());
  
  // Construct the document structure
  const document: DocumentSchema = {
    ...documentInfo,
    content: sections
  };
  
  // Validate against schema
  const result = documentSchema.safeParse(document);
  if (!result.success) {
    logger.error('Document validation failed', result.error);
    if (!mergedOptions.ignoreInvalidHtml) {
      throw new Error(`Document validation failed: ${result.error}`);
    }
  }
  
  logger.debug('HTML parsing completed successfully');
  return document;
}

export function documentToJson(document: DocumentSchema, pretty = true): string {
  // Create optimized stringify function using fast-json-stringify
  const stringify = fastJsonStringify(documentSchema);
  
  try {
    if (pretty) {
      // For pretty output, we'll use JSON.stringify
      return JSON.stringify(document, null, 2);
    }
    
    // For compact output, use fast-json-stringify
    return stringify(document);
  } catch (error) {
    logger.error('Error stringifying document', error);
    throw new Error(`Error stringifying document: ${error instanceof Error ? error.message : String(error)}`);
  }
}
