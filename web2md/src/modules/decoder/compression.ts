import { promisify } from 'node:util';
import { gunzip, inflate, brotliDecompress as nodeBrotliDecompress } from 'node:zlib';
import zstd from 'zstd-napi';
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
    
    // Check if we support the encoding
    const supportedEncodings = ['gzip', 'br', 'brotli', 'deflate', 'zstd'];
    const isSupported = supportedEncodings.some(encoding => contentEncoding.includes(encoding));
    
    if (!isSupported) {
      return false;
    }
    
    // Check if the content appears to be compressed
    // Only check for non-zstd content since zstd detection is less reliable
    if (!contentEncoding.includes('zstd') && !this.isCompressedContent(content)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if content appears to be compressed
   */
  isCompressedContent(content: string): boolean {
    // A simple heuristic - compressed content usually contains many non-printable characters
    // This is not foolproof but works for most cases
    const nonPrintableChars = content.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code > 126;
    }).length;
    
    // If more than 10% of characters are non-printable, it's likely compressed
    return (nonPrintableChars / content.length) > 0.1;
  }
  
  /**
   * Decompress content based on the content encoding
   */
  async decompress(content: string, contentEncoding: string): Promise<string> {
    this.logger.debug(`Decompressing content with encoding: ${contentEncoding}`);
    
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
      } else {
        this.logger.error(`Decompression failed with unknown error`);
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
      return decompressed.toString('utf-8');
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
      return decompressed.toString('utf-8');
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
      return decompressed.toString('utf-8');
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
    
    try {
      // For zstd content, try both binary and utf8 encoding
      // Sometimes the response might not be properly encoded as binary
      try {
        // First try as binary
        const buffer = Buffer.from(content, 'binary');
        this.logger.debug(`Attempting to decompress zstd with binary buffer of length: ${buffer.length}`);
        const decompressed = zstd.decompress(buffer);
        return decompressed.toString('utf-8');
      } catch (binaryError) {
        // If that fails, try as utf8
        this.logger.debug(`Binary buffer decompression failed, trying UTF-8: ${binaryError instanceof Error ? binaryError.message : String(binaryError)}`);
        const buffer = Buffer.from(content, 'utf8');
        this.logger.debug(`Attempting to decompress zstd with utf8 buffer of length: ${buffer.length}`);
        const decompressed = zstd.decompress(buffer);
        return decompressed.toString('utf-8');
      }
    } catch (error) {
      this.logger.error('Failed to decompress zstd content');
      if (error instanceof Error) {
        this.logger.debug(`Error details: ${error.message}`);
        
        // Check for typical Zstandard errors and log helpful messages
        if (error.message.includes('header')) {
          this.logger.debug('This may not be valid zstd-compressed content or the header may be corrupted');
        }
      }
      throw error;
    }
  }
}