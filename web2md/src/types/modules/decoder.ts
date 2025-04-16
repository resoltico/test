import { HTTPResponse } from '../core/http.js';

/**
 * Interface for content decoder
 */
export interface ContentDecoderInterface {
  /**
   * Decode content based on HTTP headers and body
   */
  decode(response: HTTPResponse): Promise<string>;
}

/**
 * Compression handler interface
 */
export interface CompressionHandler {
  /**
   * Check if the handler can decompress this content
   */
  canDecompress(contentEncoding: string, content: string): boolean;
  
  /**
   * Decompress content
   */
  decompress(content: string, contentEncoding: string): Promise<string>;
  
  /**
   * Check if content appears to be compressed
   */
  isCompressedContent(content: string): boolean;
}

/**
 * Charset handler interface
 */
export interface CharsetHandler {
  /**
   * Extract charset from content-type header
   */
  extractCharset(contentType: string): string | null;
  
  /**
   * Detect charset from content
   */
  detectCharset(content: string): string;
  
  /**
   * Convert content from one charset to another
   */
  convertCharset(content: string, fromCharset: string, toCharset?: string): string;
}
