import { MathConverter } from './base.js';
import { ConversionContext } from '../../../types/modules/math.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for LaTeX format
 */
export class LaTeXConverter extends MathConverter {
  // Special TeX words (functions) that shouldn't be in italics
  private readonly texWords = [
    'sin', 'cos', 'tan', 'csc', 'sec', 'cot', 
    'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
    'log', 'ln', 'exp', 'lim', 'sup', 'inf',
    'min', 'max', 'arg', 'det', 'dim', 'gcd', 'hom',
    'ker', 'Pr', 'deg', 'bmod'
  ];
  
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert or process LaTeX format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Processing LaTeX content`);
      
      // Simply clean and normalize the LaTeX
      const cleanedLatex = this.cleanLatex(content);
      
      // Process special Markdown-sensitive characters
      const shouldProtect = this.getContextValue(context, 'protectLatex', true);
      const processedLatex = this.processLatexSpecialChars(cleanedLatex, shouldProtect);
      
      this.logger.debug(`Successfully processed LaTeX content`);
      return processedLatex;
    } catch (error) {
      this.logger.error(`Error processing LaTeX: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return the original content on error
      return this.cleanContent(content);
    }
  }
  
  /**
   * Clean and normalize LaTeX
   */
  private cleanLatex(latex: string): string {
    // Clean HTML entities and basic formatting
    let cleaned = this.cleanContent(latex);
    
    // Remove excessive curly braces
    cleaned = cleaned
      .replace(/\{\s*([a-zA-Z0-9])\s*\}/g, '$1') // Replace {x} with x for single characters
      .replace(/\{\s*\\([a-zA-Z]+)\s*\}/g, '\\$1') // Replace {\alpha} with \alpha
      .replace(/\\\s+/g, '\\') // Remove spaces after backslashes
      .replace(/\s*\^\s*/g, '^') // Normalize spacing around ^
      .replace(/\s*\_\s*/g, '_'); // Normalize spacing around _
      
    // Ensure no double backslashes (which would appear in Markdown)
    cleaned = cleaned.replace(/\\\\/g, '\\');
    
    // Add proper spacing around operators
    cleaned = cleaned
      .replace(/([0-9])([+\-*\/=])/g, '$1 $2 ')
      .replace(/([+\-*\/=])([0-9])/g, '$1 $2');
      
    // Ensure proper spacing for math functions
    this.texWords.forEach(word => {
      // Only add commands if they're not already there
      if (!cleaned.includes(`\\${word}`)) {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        cleaned = cleaned.replace(regex, `\\${word}`);
      }
    });
    
    // Remove consecutive spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}