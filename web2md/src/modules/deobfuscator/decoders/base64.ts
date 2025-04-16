import { Decoder } from '../../../types/core/deobfuscation.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Decoder for base64 encoded content
 */
export class Base64Decoder implements Decoder {
  readonly type = 'base64';
  
  constructor(private logger: Logger) {}
  
  /**
   * Decode base64 encoded content
   * @param content The obfuscated content
   * @param metadata Additional metadata
   * @returns The decoded content
   */
  decode(content: string, metadata?: Record<string, unknown>): string {
    if (!metadata?.encoded || typeof metadata.encoded !== 'string') {
      this.logger.error('No encoded data provided for Base64 decoder');
      return content;
    }
    
    const encoded = metadata.encoded;
    this.logger.debug(`Decoding Base64: ${encoded.substring(0, 20)}...`);
    
    try {
      // For data URLs, keep the mime type part
      if (content.includes('data:') && content.includes('base64,')) {
        const dataUrl = content;
        const base64Part = encoded;
        
        // Decode the base64 part
        const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
        this.logger.debug(`Decoded Base64: ${decoded.substring(0, 20)}...`);
        
        // Return the decoded content or the original if it looks like binary data
        if (this.isTextContent(decoded)) {
          return decoded;
        }
        
        // Keep data URLs for binary content
        return dataUrl;
      }
      
      // For other base64 content
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      this.logger.debug(`Decoded Base64: ${decoded.substring(0, 20)}...`);
      
      // If the decoded content is text, use it
      if (this.isTextContent(decoded)) {
        // If the original content is an attribute, replace just the value
        if (content.match(/(?:href|src|data-\w+)\s*=\s*["'][^"']+["']/)) {
          return content.replace(/(?:href|src|data-\w+)\s*=\s*["'][^"']+["']/, (match) => {
            const attr = match.split('=')[0].trim();
            return `${attr}="${decoded}"`;
          });
        }
        
        return decoded;
      }
      
      // If it doesn't look like text, keep the original
      return content;
    } catch (error) {
      this.logger.error('Failed to decode Base64');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return content;
    }
  }
  
  /**
   * Check if content appears to be text (not binary)
   * @param content The content to check
   * @returns Whether the content appears to be text
   */
  private isTextContent(content: string): boolean {
    // Simple heuristic: if it contains mostly printable ASCII, it's probably text
    const nonPrintableChars = content.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code < 32 || code > 126;
    }).length;
    
    // If more than 10% of characters are non-printable, it's probably binary
    return (nonPrintableChars / content.length) < 0.1;
  }
}
