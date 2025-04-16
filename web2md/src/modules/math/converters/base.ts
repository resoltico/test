import { Logger } from '../../../shared/logger/console.js';

/**
 * Conversion context for math processing
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
   */
  element?: Element;
  
  /**
   * Additional options for the conversion
   */
  options?: Record<string, any>;
}

/**
 * Base class for math converters
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
      .replace(/\s+/g, ' ')
      .trim();
  }
}