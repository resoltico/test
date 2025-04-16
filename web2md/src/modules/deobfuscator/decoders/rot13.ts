import { Decoder } from '../../../types/core/deobfuscation.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Decoder for ROT13 encoded content
 */
export class ROT13Decoder implements Decoder {
  readonly type = 'rot13';
  
  constructor(private logger: Logger) {}
  
  /**
   * Decode ROT13 encoded content
   * @param content The obfuscated content
   * @param metadata Additional metadata
   * @returns The decoded content
   */
  decode(content: string, metadata?: Record<string, unknown>): string {
    if (!metadata?.encoded || typeof metadata.encoded !== 'string') {
      this.logger.error('No encoded data provided for ROT13 decoder');
      return content;
    }
    
    const encoded = metadata.encoded;
    this.logger.debug(`Decoding ROT13: ${encoded}`);
    
    try {
      // Apply ROT13 algorithm
      const decoded = encoded.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        
        // For lowercase letters
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 + 13) % 26) + 97);
        }
        
        // For uppercase letters
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 + 13) % 26) + 65);
        }
        
        return char;
      });
      
      this.logger.debug(`Decoded ROT13: ${decoded}`);
      
      // Replace the encoded content with the decoded content
      return content.replace(encoded, decoded);
    } catch (error) {
      this.logger.error('Failed to decode ROT13');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return content;
    }
  }
}
