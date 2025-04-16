import { HTTPResponse } from '../../types/core/http.js';
import { ContentDecoderInterface, CompressionHandler, CharsetHandler } from '../../types/modules/decoder.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Decodes content from HTTP responses, handling compression and character encoding
 */
export class ContentDecoder implements ContentDecoderInterface {
  constructor(
    private compressionHandler: CompressionHandler,
    private charsetHandler: CharsetHandler,
    private logger: Logger
  ) {}
  
  /**
   * Decode content based on HTTP headers and body
   */
  async decode(response: HTTPResponse): Promise<string> {
    this.logger.debug('Starting content decoding process');
    
    let content = response.body;
    const contentEncoding = response.contentEncoding.toLowerCase();
    const contentType = response.contentType.toLowerCase();
    
    // Log some details about the content to help with debugging
    this.logger.debug(`Content encoding from headers: ${contentEncoding || 'not specified'}`);
    this.logger.debug(`Content type from headers: ${contentType || 'not specified'}`);
    this.logger.debug(`Content length: ${content.length} characters`);
    
    // Handle compression if needed
    if (contentEncoding && contentEncoding !== 'identity') {
      try {
        if (this.compressionHandler.canDecompress(contentEncoding, content)) {
          this.logger.debug(`Detected supported content encoding: ${contentEncoding}`);
          content = await this.compressionHandler.decompress(content, contentEncoding);
          this.logger.debug(`Successfully decompressed content (${contentEncoding})`);
          this.logger.debug(`Decompressed content length: ${content.length} characters`);
        } else {
          this.logger.debug(`Content encoding ${contentEncoding} detected but content doesn't appear to be compressed`);
        }
      } catch (error) {
        // Log the error but continue with the original content
        if (error instanceof Error) {
          this.logger.error(`Failed to decompress ${contentEncoding} content: ${error.message}`);
        } else {
          this.logger.error(`Failed to decompress ${contentEncoding} content`);
        }
        // Continue with the original content
      }
    } else {
      this.logger.debug('No content encoding specified or identity encoding, skipping decompression');
    }
    
    // Detect character encoding from content-type header
    let charset = this.charsetHandler.extractCharset(contentType);
    
    if (!charset) {
      // If no charset in content-type, try to detect from the content
      charset = this.charsetHandler.detectCharset(content);
      this.logger.debug(`No charset in headers, detected: ${charset}`);
    } else {
      this.logger.debug(`Charset from headers: ${charset}`);
    }
    
    // Convert to UTF-8 if needed
    if (charset && charset.toLowerCase() !== 'utf-8') {
      try {
        const originalContent = content;
        content = this.charsetHandler.convertCharset(content, charset);
        
        // Check if conversion actually changed anything
        if (content !== originalContent) {
          this.logger.debug(`Successfully converted content from ${charset} to UTF-8`);
        } else {
          this.logger.debug(`Character encoding conversion from ${charset} had no effect`);
        }
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Character encoding conversion failed: ${error.message}`);
        }
        // Continue with original content
      }
    }
    
    // Check if the content looks like HTML
    const isHTML = this.isValidHtml(content);
                  
    if (!isHTML) {
      this.logger.debug('Warning: Content does not appear to be HTML. This may indicate decompression issues.');
      
      // Log a sample of the content for debugging
      const sample = content.length > 100 ? content.substring(0, 100) + '...' : content;
      this.logger.debug(`Content sample: ${sample}`);
    }
    
    this.logger.debug('Content decoding process completed');
    
    return content;
  }
  
  /**
   * Check if content appears to be valid HTML
   */
  private isValidHtml(content: string): boolean {
    // Simple heuristic checks for common HTML elements
    return Boolean(
      content.includes('<!DOCTYPE html>') || 
      content.includes('<html') || 
      (content.includes('<head') && content.includes('<body')) ||
      content.match(/<h[1-6][^>]*>/) || // Has headings
      content.match(/<div[^>]*>/) // Has div elements
    );
  }
}