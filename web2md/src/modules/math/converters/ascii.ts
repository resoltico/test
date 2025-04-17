import { MathConverter } from './base.js';
import { ConversionContext } from '../../../types/modules/math.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for ASCII math format
 */
export class ASCIIMathConverter extends MathConverter {
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert ASCII math to LaTeX
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting ASCIIMath to LaTeX`);
      
      // If the target format is ASCIIMath and the source is already ASCIIMath,
      // just clean and return
      const outputFormat: string = this.getContextValue(context, 'outputFormat', 'latex');
      // Use as string to avoid TypeScript literal type inference issues
      if (outputFormat as string === 'ascii' && context.sourceFormat === 'ascii') {
        return this.cleanASCIIMath(content);
      }
      
      // Otherwise, convert ASCIIMath to LaTeX
      const latex = this.convertASCIIToLaTeX(content);
      
      // Process special Markdown-sensitive characters
      const shouldProtect = this.getContextValue(context, 'protectLatex', true);
      const processedLatex = this.processLatexSpecialChars(latex, shouldProtect);
      
      this.logger.debug(`Successfully converted ASCIIMath to LaTeX`);
      return processedLatex;
    } catch (error) {
      this.logger.error(`Error converting ASCIIMath: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return the original content on error
      return this.cleanContent(content);
    }
  }
  
  /**
   * Clean and normalize ASCII math
   */
  private cleanASCIIMath(ascii: string): string {
    // Clean HTML entities and basic formatting
    return this.cleanContent(ascii);
  }
  
  /**
   * Convert ASCII math to LaTeX
   * This is a simplified implementation as a full one would need a proper ASCIIMath parser
   */
  private convertASCIIToLaTeX(ascii: string): string {
    // Clean the input
    let content = this.cleanContent(ascii);
    
    // Apply a series of replacements to convert ASCIIMath syntax to LaTeX
    
    // Fractions
    content = content.replace(/(\w+)\/(\w+)/g, '\\frac{$1}{$2}');
    
    // Superscripts (e.g., x^2)
    content = content.replace(/(\w)\^(\w+)/g, '$1^{$2}');
    
    // Subscripts (e.g., x_n)
    content = content.replace(/(\w)_(\w+)/g, '$1_{$2}');
    
    // Square roots
    content = content.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    
    // Common functions
    content = content.replace(/\b(sin|cos|tan|log|ln|exp)\(/g, '\\$1(');
    
    // Greek letters
    content = content.replace(/\b(alpha|beta|gamma|delta|epsilon|theta|pi)\b/g, '\\$1');
    
    // Standard operators
    content = content
      .replace(/\*\*/g, '^') // Exponentiation
      .replace(/!=|ne/g, '\\neq') // Not equal
      .replace(/<=|le/g, '\\leq') // Less than or equal
      .replace(/>=|ge/g, '\\geq') // Greater than or equal
      .replace(/infinity|oo/g, '\\infty') // Infinity
      .replace(/([^\\])pi/g, '$1\\pi') // Pi symbol
      .replace(/\bsum\b/g, '\\sum') // Sum symbol
      .replace(/\bprod\b/g, '\\prod') // Product symbol
      .replace(/\blim\b/g, '\\lim') // Limit
      .replace(/\bint\b/g, '\\int'); // Integral
    
    return content;
  }
}