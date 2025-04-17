import { Logger } from '../../shared/logger/console.js';
import { MathConverterFactory } from './converters/factory.js';
import { PLACEHOLDER_FORMAT } from './extractor.js';
import { MathRestorerOptions } from '../../types/modules/math.js';

/**
 * Placeholder pattern to match in Markdown - derived from PLACEHOLDER_FORMAT
 * Creates a RegExp that matches the pattern with any number in the placeholder
 */
const PLACEHOLDER_PATTERN = new RegExp(PLACEHOLDER_FORMAT.replace('%d', '(\\d+)'), 'g');

/**
 * Also check for unformatted placeholders (without %%)
 */
const UNFORMATTED_PLACEHOLDER_PATTERN = /MATH_PLACEHOLDER_(\d+)/g;

/**
 * Restores math content from placeholders in Markdown
 */
export class MathRestorer {
  private options: MathRestorerOptions;
  private converterFactory: MathConverterFactory;
  
  constructor(
    private logger: Logger,
    options?: Partial<MathRestorerOptions>
  ) {
    // Default options
    this.options = {
      inlineDelimiter: '$',
      blockDelimiter: '$$',
      outputFormat: 'latex',
      ...options
    };
    
    // Create converter factory
    this.converterFactory = new MathConverterFactory(logger);
    
    this.logger.debug('Math restorer initialized with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Configure the restorer with new options
   */
  configure(options: Partial<MathRestorerOptions>): void {
    // Merge new options with existing ones
    this.options = {
      ...this.options,
      ...options
    };
    
    this.logger.debug('Math restorer reconfigured with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Restore math content in Markdown from placeholders
   */
  async restore(
    markdown: string,
    placeholderMap: Map<string, {content: string; isDisplay: boolean; format: string}>
  ): Promise<string> {
    try {
      this.logger.debug('Restoring math content in Markdown');
      this.logger.debug(`Placeholder map contains ${placeholderMap.size} entries`);
      
      // Log placeholders for debugging
      placeholderMap.forEach((value, key) => {
        this.logger.debug(`Placeholder: ${key}, Format: ${value.format}, Display: ${value.isDisplay}`);
      });
      
      // Create a converter for the target format
      const converter = this.converterFactory.createConverter(this.options.outputFormat);
      
      if (!converter) {
        throw new Error(`No converter available for format: ${this.options.outputFormat}`);
      }
      
      // Start with the original markdown
      let processedMarkdown = markdown;
      
      // First pass: handle formatted placeholders (%%MATH_PLACEHOLDER_N%%)
      for (const [placeholder, mathInfo] of placeholderMap.entries()) {
        if (processedMarkdown.includes(placeholder)) {
          // Convert the content
          const content = await this.convertContent(mathInfo, converter);
          
          // Add appropriate delimiters based on display mode
          const delimiter = mathInfo.isDisplay ? this.options.blockDelimiter : this.options.inlineDelimiter;
          let replacement = `${delimiter}${content}${delimiter}`;
          
          // Add line breaks for block math for better Markdown rendering
          if (mathInfo.isDisplay) {
            replacement = `\n\n${replacement}\n\n`;
          }
          
          // Replace all occurrences of the placeholder
          processedMarkdown = processedMarkdown.split(placeholder).join(replacement);
          this.logger.debug(`Replaced formatted placeholder: ${placeholder}`);
        }
      }
      
      // Second pass: handle unformatted placeholders (MATH_PLACEHOLDER_N without %%)
      // This handles cases where the formatting might have been stripped
      const unformattedMatches = [...processedMarkdown.matchAll(UNFORMATTED_PLACEHOLDER_PATTERN)];
      for (const match of unformattedMatches) {
        const fullMatch = match[0]; // MATH_PLACEHOLDER_N
        const numberPart = match[1]; // Just the number N
        
        // Try to find the original placeholder
        const originalPlaceholder = `%%MATH_PLACEHOLDER_${numberPart}%%`;
        const mathInfo = placeholderMap.get(originalPlaceholder);
        
        if (mathInfo) {
          // Convert the content
          const content = await this.convertContent(mathInfo, converter);
          
          // Add appropriate delimiters
          const delimiter = mathInfo.isDisplay ? this.options.blockDelimiter : this.options.inlineDelimiter;
          let replacement = `${delimiter}${content}${delimiter}`;
          
          // Add line breaks for block math
          if (mathInfo.isDisplay) {
            replacement = `\n\n${replacement}\n\n`;
          }
          
          // Replace this occurrence
          processedMarkdown = processedMarkdown.replace(fullMatch, replacement);
          this.logger.debug(`Replaced unformatted placeholder: ${fullMatch}`);
        }
      }
      
      return processedMarkdown;
    } catch (error) {
      this.logger.error('Error restoring math in Markdown');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Return the original markdown in case of error
      return markdown;
    }
  }
  
  /**
   * Convert content based on format
   */
  private async convertContent(
    mathInfo: {content: string; isDisplay: boolean; format: string},
    converter: any
  ): Promise<string> {
    try {
      // Configure context for the converter
      const context = {
        sourceFormat: mathInfo.format,
        isDisplay: mathInfo.isDisplay,
        options: {
          inlineDelimiter: this.options.inlineDelimiter,
          blockDelimiter: this.options.blockDelimiter
        }
      };
      
      // Convert the content using the appropriate converter
      return await converter.convert(mathInfo.content, context);
    } catch (error) {
      this.logger.error(`Error converting math content: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return the original content if conversion fails
      return mathInfo.content;
    }
  }
}