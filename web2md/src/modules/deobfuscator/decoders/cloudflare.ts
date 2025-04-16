import { Decoder } from '../../../types/core/deobfuscation.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Decoder for Cloudflare email protection
 */
export class CloudflareEmailDecoder implements Decoder {
  readonly type = 'cloudflare';
  
  constructor(private logger: Logger) {}
  
  /**
   * Decode Cloudflare email protection
   * Based on the algorithm in cloudflare-static-email-decode.min.js
   * @param content The obfuscated content
   * @param metadata Additional metadata
   * @returns The decoded content
   */
  decode(content: string, metadata?: Record<string, unknown>): string {
    if (!metadata?.encoded || typeof metadata.encoded !== 'string') {
      this.logger.error('No encoded data provided for Cloudflare decoder');
      return content;
    }
    
    const encoded = metadata.encoded;
    this.logger.debug(`Decoding Cloudflare email: ${encoded}`);
    
    try {
      // Implementation based on the deobfuscation algorithm in cloudflare-static-email-decode.min.js
      let email = '';
      const key = parseInt(encoded.substr(0, 2), 16);
      
      for (let i = 2; i < encoded.length; i += 2) {
        const hexChar = encoded.substr(i, 2);
        const charCode = parseInt(hexChar, 16) ^ key;
        email += String.fromCharCode(charCode);
      }
      
      // Try to decode URI component in case of special characters
      try {
        email = decodeURIComponent(escape(email));
      } catch (e) {
        // Ignore error, use as-is
      }
      
      this.logger.debug(`Decoded email: ${email}`);
      
      // Return as mailto: link or plain text based on the original content
      if (content.includes('href') && email.includes('@')) {
        return content.replace(/href\s*=\s*["']\/cdn-cgi\/l\/email-protection[^"']*["']/i, `href="mailto:${email}"`);
      } else if (content.includes('__cf_email__')) {
        return content.replace(/<span[^>]+class\s*=\s*["']__cf_email__["'][^>]+data-cfemail\s*=\s*["'][a-zA-Z0-9]+["'][^>]*>[^<]*<\/span>/i, email);
      }
      
      return email;
    } catch (error) {
      this.logger.error('Failed to decode Cloudflare email');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return content;
    }
  }
}
