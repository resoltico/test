import { MathConverter, ConversionContext } from './base.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for MathML format
 * This converter preserves or passes through MathML content
 */
export class MathMLConverter extends MathConverter {
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert to MathML format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Processing MathML content`);
      
      // If source is already MathML, clean and return it
      if (context.sourceFormat === 'mathml') {
        return this.cleanMathML(content);
      }
      
      // For other formats, we'd need to convert to MathML
      // This is complex and would typically require an external library
      // For now, we'll just return the original content with a warning
      this.logger.warn(`Converting from ${context.sourceFormat} to MathML is not fully implemented`);
      return this.cleanContent(content);
    } catch (error) {
      this.logger.error(`Error processing MathML: ${error instanceof Error ? error.message : String(error)}`);
      return this.cleanContent(content);
    }
  }
  
  /**
   * Clean and normalize MathML
   */
  private cleanMathML(mathml: string): string {
    // Clean HTML entities
    let cleaned = this.cleanContent(mathml);
    
    // Make sure it has proper XML namespace
    if (!cleaned.includes('xmlns="http://www.w3.org/1998/Math/MathML"')) {
      cleaned = cleaned.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"');
    }
    
    return cleaned;
  }
}