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
      
      // Skip processing if content is empty
      if (!content || content.trim().length === 0) {
        return '';
      }
      
      // Check if content is already LaTeX - we detect by looking for backslashes and braces
      const hasLatexMarkers = /[\\{}]/.test(content);
      
      if (!hasLatexMarkers) {
        // If it doesn't look like LaTeX, wrap simple expressions
        if (/^[a-zA-Z0-9+\-*\/=^()[\] ]+$/.test(content)) {
          return content;
        }
      }
      
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
    
    // Remove HTML-like tags that might be present
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Remove excessive curly braces
    cleaned = cleaned
      .replace(/\{\s*([a-zA-Z0-9])\s*\}/g, '$1') // Replace {x} with x for single characters
      .replace(/\{\s*\\([a-zA-Z]+)\s*\}/g, '\\$1') // Replace {\alpha} with \alpha
      .replace(/\\\s+/g, '\\') // Remove spaces after backslashes
      .replace(/\s*\^\s*/g, '^') // Normalize spacing around ^
      .replace(/\s*\_\s*/g, '_'); // Normalize spacing around _
      
    // Ensure no double backslashes (which would appear in Markdown)
    cleaned = cleaned.replace(/\\\\/g, '\\');
    
    // Fix common LaTeX syntax errors
    cleaned = cleaned
      // Fix missing braces for multi-character superscripts/subscripts
      .replace(/\^([a-zA-Z0-9]{2,})/g, '^{$1}')
      .replace(/_([a-zA-Z0-9]{2,})/g, '_{$1}')
      
      // Add proper spacing around operators
      .replace(/([0-9])([+\-*\/=])/g, '$1 $2 ')
      .replace(/([+\-*\/=])([0-9])/g, '$1 $2')
      
      // Add commands to common operators
      .replace(/\bsum\b(?!\{)/g, '\\sum')
      .replace(/\bint\b(?!\{)/g, '\\int')
      .replace(/\bprod\b(?!\{)/g, '\\prod')
      .replace(/\blim\b(?!\{)/g, '\\lim')
      
      // Add braces to fractions with simple numerators/denominators
      .replace(/\\frac([a-zA-Z0-9])([a-zA-Z0-9])/g, '\\frac{$1}{$2}')
      
      // Fix common escaping issues
      .replace(/\_/g, '_')
      
      // Ensure proper formatting for functions
      .replace(/\\([a-zA-Z]+)([^a-zA-Z{]|$)/g, '\\$1 $2');
      
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
  
  /**
   * Process LaTeX special characters for Markdown compatibility
   * Override the base method for LaTeX-specific handling
   */
  protected processLatexSpecialChars(latex: string, shouldProtect = true): string {
    if (!shouldProtect) {
      return latex;
    }
    
    // Make sure backslashes are single (not doubled)
    let result = latex.replace(/\\\\/g, '\\');
    
    // Handle underscores - critical for subscripts in LaTeX
    // Replace any unescaped underscores with escaped ones for Markdown compatibility
    result = result.replace(/([^\\])_/g, '$1\\_');
    
    // Handle asterisks - they should be literal in math, not bold/italic markers
    result = result.replace(/([^\\])\*/g, '$1\\*');
    
    // Fix cases where we incorrectly escaped characters inside LaTeX commands
    result = result.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    
    // Make sure any \$ is treated as a literal $, not a math delimiter
    result = result.replace(/\\\$/g, '\\\\$');
    
    return result;
  }
}