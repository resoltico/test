import { Logger } from '../../../shared/logger/console.js';
import { ConversionContext } from '../../../types/modules/math.js';

/**
 * Base class for math converters
 * Provides a consistent interface and shared utilities
 */
export abstract class MathConverter {
  constructor(protected logger: Logger) {}
  
  /**
   * Convert math content from one format to another
   * @param content The math content to convert
   * @param context Context information for the conversion
   * @returns The converted content
   */
  abstract convert(content: string, context: ConversionContext): Promise<string>;
  
  /**
   * Clean HTML entities and normalize whitespace
   * @param content The content to clean
   * @returns The cleaned content
   */
  protected cleanContent(string: string): string {
    if (!string) return '';
    
    return string
      // HTML entity replacements
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&#x3D;/g, "=")
      .replace(/&#x3C;/g, "<")
      .replace(/&#x3E;/g, ">")
      // General cleanup
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Get a value from the conversion context with fallback
   * @param context The conversion context
   * @param key The key to look for
   * @param defaultValue Default value if not found
   * @returns The value from context or default
   */
  protected getContextValue<T>(context: ConversionContext, key: string, defaultValue: T): T {
    if (context.options && key in context.options) {
      return context.options[key] as T;
    }
    
    // Try to get from element attributes if element is available
    if (context.element) {
      const attrName = `data-math-${key.toLowerCase().replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`;
      const attrValue = context.element.getAttribute(attrName);
      if (attrValue !== null) {
        // Try to convert to the right type
        if (typeof defaultValue === 'boolean') {
          return (attrValue === 'true') as unknown as T;
        }
        if (typeof defaultValue === 'number') {
          return Number(attrValue) as unknown as T;
        }
        return attrValue as unknown as T;
      }
    }
    
    return defaultValue;
  }
  
  /**
   * Get delimiters from the context
   * @param context The conversion context
   * @returns Object with inline and block delimiters
   */
  protected getDelimiters(context: ConversionContext): { inline: string, block: string } {
    return {
      inline: this.getContextValue(context, 'inlineDelimiter', '$'),
      block: this.getContextValue(context, 'blockDelimiter', '$$')
    };
  }
  
  /**
   * Process special Markdown-sensitive characters in LaTeX
   * to prevent them from being escaped by Markdown processors
   * @param latex The LaTeX content
   * @param shouldProtect Whether to protect from Markdown escaping
   * @returns The processed LaTeX
   */
  protected processLatexSpecialChars(latex: string, shouldProtect = true): string {
    if (!shouldProtect) {
      return latex;
    }
    
    // Make sure backslashes are single (not doubled)
    let result = latex.replace(/\\\\/g, '\\');
    
    // Handle underscores - we want them to be literal in math, not italic markers
    // But we don't want to over-escape them
    result = result.replace(/(?<!\\)_/g, '\\_');
    
    // Handle asterisks - they should be literal in math, not bold/italic markers
    result = result.replace(/(?<!\\)\*/g, '\\*');
    
    // Make sure the output doesn't have markdown-conflicting characters unescaped
    result = result
      .replace(/(?<!\\)\[/g, '\\[')
      .replace(/(?<!\\)\]/g, '\\]');
    
    return result;
  }
  
  /**
   * Wrap content in delimiters based on display mode
   * @param content The content to wrap
   * @param isDisplay Whether the content is display math or inline
   * @param context The conversion context
   * @returns The wrapped content
   */
  protected wrapWithDelimiters(content: string, isDisplay: boolean, context: ConversionContext): string {
    const { inline, block } = this.getDelimiters(context);
    const delimiter = isDisplay ? block : inline;
    
    if (isDisplay) {
      return `\n\n${delimiter}${content}${delimiter}\n\n`;
    }
    
    return `${delimiter}${content}${delimiter}`;
  }
}