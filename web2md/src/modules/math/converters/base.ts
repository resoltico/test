import { Logger } from '../../../shared/logger/console.js';

/**
 * Conversion context for math processing
 * Contains all information needed for context-aware conversions
 */
export interface ConversionContext {
  /**
   * Original format of the content
   */
  sourceFormat: string;
  
  /**
   * Whether the math should be displayed in block mode
   */
  isDisplay: boolean;
  
  /**
   * The original element (if available)
   * This allows accessing attributes and other DOM information
   */
  element?: Element;
  
  /**
   * Additional options for the conversion
   * Such as delimiters and format-specific settings
   */
  options?: Record<string, any>;
}

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
  protected cleanContent(content: string): string {
    return content
      // HTML entity replacements
      .replace(/\&lt;/g, '<')
      .replace(/\&gt;/g, '>')
      .replace(/\&amp;/g, '&')
      .replace(/\&quot;/g, '"')
      .replace(/\&apos;/g, "'")
      .replace(/\&#39;/g, "'")
      .replace(/\&#x27;/g, "'")
      .replace(/\&#x2F;/g, "/")
      .replace(/\&#x3D;/g, "=")
      .replace(/\&#x3C;/g, "<")
      .replace(/\&#x3E;/g, ">")
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
   * Extract specific math content from an element if available
   * @param context The conversion context
   * @param format Specific format to look for
   * @returns The extracted content or null if not found
   */
  protected extractFormatContent(context: ConversionContext, format: string): string | null {
    if (!context.element) {
      return null;
    }
    
    // Check for data attribute with the format
    const dataAttr = `data-${format}`;
    if (context.element.hasAttribute(dataAttr)) {
      return context.element.getAttribute(dataAttr);
    }
    
    // Check for direct attribute
    if (context.element.hasAttribute(format)) {
      return context.element.getAttribute(format);
    }
    
    return null;
  }
  
  /**
   * Format the content with the appropriate delimiters
   * @param content The content to format
   * @param context The conversion context
   * @returns The formatted content
   */
  protected formatWithDelimiters(content: string, context: ConversionContext): string {
    const { inline, block } = this.getDelimiters(context);
    const delimiter = context.isDisplay ? block : inline;
    
    // Return content with delimiters
    // Note: spacing is handled by the rule
    return `${delimiter}${content}${delimiter}`;
  }
}