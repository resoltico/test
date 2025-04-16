import { promisify } from 'node:util';
import { gunzip, inflate, brotliDecompress as nodeBrotliDecompress } from 'node:zlib';
import { CompressionHandler } from '../../types/modules/decoder.js';
import { Logger } from '../../shared/logger/console.js';

// Promisify Node.js callback-based APIs
const brotliDecompressAsync = promisify(nodeBrotliDecompress);

/**
 * Handles various compression formats for content decoding
 */
export class CompressionHandlerImpl implements CompressionHandler {
  constructor(private logger: Logger) {}
  
  /**
   * Check if the handler can decompress content with the given encoding
   */
  canDecompress(contentEncoding: string, content: string): boolean {
    if (!contentEncoding || contentEncoding === 'identity') {
      return false;
    }
    
    // Check if the content appears to be compressed
    if (!this.isCompressedContent(content)) {
      return false;
    }
    
    // Check if we support the encoding
    const supportedEncodings = ['gzip', 'br', 'brotli', 'deflate', 'zstd'];
    return supportedEncodings.some(encoding => contentEncoding.includes(encoding));
  }
  
  /**
   * Check if content appears to be compressed
   */
  isCompressedContent(content: string): boolean {
    // A simple heuristic - compressed content usually contains many non-printable characters
    // This is not foolproof but works for most cases
    const nonPrintableChars = content.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code < 32 || code > 126;
    }).length;
    
    // If more than 10% of characters are non-printable, it's likely compressed
    return (nonPrintableChars / content.length) > 0.1;
  }
  
  /**
   * Decompress content based on the content encoding
   */
  async decompress(content: string, contentEncoding: string): Promise<string> {
    this.logger.debug(`Decompressing content with encoding: ${contentEncoding}`);
    
    if (!this.isCompressedContent(content)) {
      this.logger.debug('Content does not appear to be compressed, skipping decompression');
      return content;
    }
    
    try {
      if (contentEncoding.includes('gzip')) {
        return await this.decompressGzip(content);
      } else if (contentEncoding.includes('br') || contentEncoding.includes('brotli')) {
        return await this.decompressBrotli(content);
      } else if (contentEncoding.includes('deflate')) {
        return await this.decompressDeflate(content);
      } else if (contentEncoding.includes('zstd')) {
        return await this.decompressZstd(content);
      }
      
      this.logger.debug(`Unsupported compression format: ${contentEncoding}`);
      return content;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Decompression failed: ${error.message}`);
      }
      return content; // Return original content on error
    }
  }
  
  /**
   * Decompress gzip content
   */
  private async decompressGzip(content: string): Promise<string> {
    this.logger.debug('Decompressing gzip content');
    
    try {
      const buffer = Buffer.from(content, 'binary');
      const decompressed = await promisify(gunzip)(buffer);
      return decompressed.toString();
    } catch (error) {
      this.logger.error('Failed to decompress gzip content');
      throw error;
    }
  }
  
  /**
   * Decompress brotli content
   */
  private async decompressBrotli(content: string): Promise<string> {
    this.logger.debug('Decompressing brotli content');
    
    try {
      const buffer = Buffer.from(content, 'binary');
      // Use the promisified version of brotliDecompress
      const decompressed = await brotliDecompressAsync(buffer);
      return decompressed.toString();
    } catch (error) {
      this.logger.error('Failed to decompress brotli content');
      throw error;
    }
  }
  
  /**
   * Decompress deflate content
   */
  private async decompressDeflate(content: string): Promise<string> {
    this.logger.debug('Decompressing deflate content');
    
    try {
      const buffer = Buffer.from(content, 'binary');
      const decompressed = await promisify(inflate)(buffer);
      return decompressed.toString();
    } catch (error) {
      this.logger.error('Failed to decompress deflate content');
      throw error;
    }
  }
  
  /**
   * Decompress zstd content
   */
  private async decompressZstd(content: string): Promise<string> {
    this.logger.debug('Decompressing zstd content');
    
    // Note: Node.js doesn't have native zstd support
    // In a real implementation, you would use a library like 'node-zstandard'
    this.logger.warn('Zstd decompression not implemented yet - would require additional dependency');
    return content;
  }
}
