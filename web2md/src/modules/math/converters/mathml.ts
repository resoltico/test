import { JSDOM } from 'jsdom';
import { MathConverter, ConversionContext } from './base.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for MathML format
 * This converter preserves or passes through MathML content
 * and can convert LaTeX to MathML when needed
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
      
      // If source is LaTeX, try to convert it to MathML
      if (context.sourceFormat === 'latex' || context.sourceFormat === 'tex') {
        // This would require an external library like MathJax
        // For now, we'll keep the LaTeX as is and wrap it in metadata
        this.logger.warn(`Converting LaTeX to MathML requires external libraries - returning original content`);
        return this.wrapLatexInMathML(content, context.isDisplay);
      }
      
      // For ASCII sources
      if (context.sourceFormat === 'ascii' || context.sourceFormat === 'asciimath') {
        this.logger.warn(`Converting ASCIIMath to MathML requires external libraries - returning original content`);
        // Similar approach - wrap in simplified MathML
        return this.wrapASCIIMathInMathML(content, context.isDisplay);
      }
      
      // Default: return cleaned original content
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
    
    // If it's not wrapped in a math tag already, wrap it
    if (!cleaned.startsWith('<math')) {
      cleaned = `<math xmlns="http://www.w3.org/1998/Math/MathML">${cleaned}</math>`;
    }
    
    return cleaned;
  }
  
  /**
   * Wrap LaTeX content in MathML annotation for compatibility
   */
  private wrapLatexInMathML(latex: string, isDisplay: boolean): string {
    // Create a simple MathML structure with annotation
    const displayAttr = isDisplay ? ' display="block"' : '';
    
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr}>
  <semantics>
    <annotation encoding="application/x-tex">${this.escapeXml(latex)}</annotation>
  </semantics>
</math>`;
  }
  
  /**
   * Wrap ASCIIMath content in MathML annotation for compatibility
   */
  private wrapASCIIMathInMathML(asciimath: string, isDisplay: boolean): string {
    // Create a simple MathML structure with annotation
    const displayAttr = isDisplay ? ' display="block"' : '';
    
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr}>
  <semantics>
    <annotation encoding="application/x-asciimath">${this.escapeXml(asciimath)}</annotation>
  </semantics>
</math>`;
  }
  
  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}