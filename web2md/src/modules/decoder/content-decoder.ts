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
    
    // Handle compression if needed
    if (this.compressionHandler.canDecompress(contentEncoding, content)) {
      this.logger.debug(`Detected content encoding: ${contentEncoding}`);
      content = await this.compressionHandler.decompress(content, contentEncoding);
    }
    
    // Detect character encoding from content-type header
    let charset = this.charsetHandler.extractCharset(contentType);
    
    if (!charset) {
      // If no charset in content-type, try to detect from the content
      charset = this.charsetHandler.detectCharset(content);
    }
    
    this.logger.debug(`Using character encoding: ${charset}`);
    
    // Convert to UTF-8 if needed
    if (charset && charset.toLowerCase() !== 'utf-8') {
      content = this.charsetHandler.convertCharset(content, charset);
    }
    
    this.logger.debug('Content decoding process completed');
    
    return content;
  }
}
