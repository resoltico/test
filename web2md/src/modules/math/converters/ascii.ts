import { MathConverter, ConversionContext } from './base.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for ASCII math format
 */
export class ASCIIMathConverter extends MathConverter {
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert to ASCII math format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting to ASCIIMath format`);
      
      // If source is already ASCIIMath, clean and return it
      if (context.sourceFormat === 'ascii') {
        return this.cleanASCIIMath(content);
      }
      
      // For other formats, we'd need to convert to ASCIIMath
      // This is complex and would typically require an external library
      // For now, we'll just return the original content with a warning
      this.logger.warn(`Converting from ${context.sourceFormat} to ASCIIMath is not fully implemented`);
      return this.cleanContent(content);
    } catch (error) {
      this.logger.error(`Error converting to ASCIIMath: ${error instanceof Error ? error.message : String(error)}`);
      return this.cleanContent(content);
    }
  }
  
  /**
   * Clean and normalize ASCII math
   */
  private cleanASCIIMath(ascii: string): string {
    // Clean HTML entities
    let cleaned = this.cleanContent(ascii);
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}