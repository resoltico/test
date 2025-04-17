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
  
  constructor(
    private logger: Logger,
    options?: Partial<MathRestorerOptions>,
    private converterFactory?: MathConverterFactory
  ) {
    // Default options
    this.options = {
      inlineDelimiter: '$',
      blockDelimiter: '$$',
      outputFormat: 'latex',
      ...options
    };
    
    // Create converter factory if not provided
    if (!this.converterFactory) {
      this.converterFactory = new MathConverterFactory(logger);
    }
    
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
      
      // If there are no placeholders, return the original markdown
      if (placeholderMap.size === 0) {
        return markdown;
      }
      
      // Create a map of conversions to avoid repeated work
      const conversionCache = new Map<string, string>();
      
      // Start with the original markdown
      let processedMarkdown = markdown;
      let placeholdersReplaced = 0;
      
      // First pass: handle formatted placeholders (%%MATH_PLACEHOLDER_N%%)
      for (const [placeholder, mathInfo] of placeholderMap.entries()) {
        if (processedMarkdown.includes(placeholder)) {
          try {
            // Get or compute converted content
            let convertedContent: string;
            const cacheKey = `${mathInfo.format}:${mathInfo.isDisplay}:${mathInfo.content}`;
            
            if (conversionCache.has(cacheKey)) {
              convertedContent = conversionCache.get(cacheKey)!;
              this.logger.debug(`Using cached conversion for ${placeholder}`);
            } else {
              // Convert the content
              convertedContent = await this.convertContent(mathInfo);
              conversionCache.set(cacheKey, convertedContent);
            }
            
            // Format the math with appropriate delimiters and spacing
            const formattedMath = this.formatMathContent(convertedContent, mathInfo.isDisplay);
            
            // Replace all occurrences of the placeholder
            const beforeReplace = processedMarkdown;
            processedMarkdown = processedMarkdown.split(placeholder).join(formattedMath);
            
            // Check if replacement was successful
            if (beforeReplace !== processedMarkdown) {
              placeholdersReplaced++;
              this.logger.debug(`Replaced formatted placeholder: ${placeholder}`);
            }
          } catch (error) {
            this.logger.error(`Error processing placeholder ${placeholder}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Second pass: handle unformatted placeholders (MATH_PLACEHOLDER_N without %%)
      // This handles cases where the formatting might have been stripped
      const unformattedMatches = Array.from(processedMarkdown.matchAll(UNFORMATTED_PLACEHOLDER_PATTERN));
      for (const match of unformattedMatches) {
        const fullMatch = match[0]; // MATH_PLACEHOLDER_N
        const numberPart = match[1]; // Just the number N
        
        // Try to find the original placeholder
        const originalPlaceholder = `%%MATH_PLACEHOLDER_${numberPart}%%`;
        const mathInfo = placeholderMap.get(originalPlaceholder);
        
        if (mathInfo) {
          try {
            // Get or compute converted content
            let convertedContent: string;
            const cacheKey = `${mathInfo.format}:${mathInfo.isDisplay}:${mathInfo.content}`;
            
            if (conversionCache.has(cacheKey)) {
              convertedContent = conversionCache.get(cacheKey)!;
            } else {
              // Convert the content
              convertedContent = await this.convertContent(mathInfo);
              conversionCache.set(cacheKey, convertedContent);
            }
            
            // Format the math with appropriate delimiters and spacing
            const formattedMath = this.formatMathContent(convertedContent, mathInfo.isDisplay);
            
            // Replace this occurrence
            processedMarkdown = processedMarkdown.replace(fullMatch, formattedMath);
            placeholdersReplaced++;
            this.logger.debug(`Replaced unformatted placeholder: ${fullMatch}`);
          } catch (error) {
            this.logger.error(`Error processing unformatted placeholder ${fullMatch}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      this.logger.debug(`Restored ${placeholdersReplaced} placeholders out of ${placeholderMap.size} total`);
      
      // Check for placeholders that weren't replaced
      const remainingPlaceholders = this.findRemainingPlaceholders(processedMarkdown);
      if (remainingPlaceholders.length > 0) {
        this.logger.warn(`${remainingPlaceholders.length} placeholders were not replaced`);
        for (const placeholder of remainingPlaceholders.slice(0, 3)) { // Log first 3
          this.logger.debug(`Unreplaced placeholder: ${placeholder}`);
        }
      }
      
      // Validate balanced delimiters in the final output
      this.validateDelimiters(processedMarkdown);
      
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
   * Convert math content based on format
   */
  private async convertContent(
    mathInfo: {content: string; isDisplay: boolean; format: string}
  ): Promise<string> {
    try {
      // Get the appropriate converter for the source format
      const converter = this.converterFactory!.createConverter(mathInfo.format);
      
      if (!converter) {
        this.logger.warn(`No converter available for format: ${mathInfo.format}`);
        // If no converter, return the original content
        return mathInfo.content;
      }
      
      // Configure context for the converter
      const context = {
        sourceFormat: mathInfo.format,
        isDisplay: mathInfo.isDisplay,
        options: {
          inlineDelimiter: this.options.inlineDelimiter,
          blockDelimiter: this.options.blockDelimiter,
          outputFormat: this.options.outputFormat,
          // Tell the converter to protect LaTeX from Markdown escaping
          protectLatex: true
        }
      };
      
      // Convert the content using the appropriate converter
      const convertedContent = await converter.convert(mathInfo.content, context);
      
      // If conversion returned nothing or failed, return the original
      if (!convertedContent || convertedContent.trim() === '') {
        this.logger.warn(`Conversion for ${mathInfo.format} returned empty result`);
        return mathInfo.content;
      }
      
      return convertedContent;
    } catch (error) {
      this.logger.error(`Error converting math content: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return the original content if conversion fails
      return mathInfo.content;
    }
  }
  
  /**
   * Format math content with appropriate delimiters and spacing
   */
  private formatMathContent(content: string, isDisplay: boolean): string {
    // Trim whitespace and normalize
    const cleanedContent = content.trim();
    
    // Add appropriate delimiters
    const delimiter = isDisplay ? this.options.blockDelimiter : this.options.inlineDelimiter;
    
    // For display math, ensure proper spacing around the math for better readability
    if (isDisplay) {
      // Use newlines around display math to ensure it's properly rendered as a block
      return `\n\n${delimiter}${cleanedContent}${delimiter}\n\n`;
    } else {
      // For inline math, no additional spacing needed
      return `${delimiter}${cleanedContent}${delimiter}`;
    }
  }
  
  /**
   * Find any placeholders that remain in the processed markdown
   */
  private findRemainingPlaceholders(markdown: string): string[] {
    const placeholders = [];
    
    // Look for formatted placeholders
    const formattedMatches = markdown.match(PLACEHOLDER_PATTERN);
    if (formattedMatches) {
      placeholders.push(...formattedMatches);
    }
    
    // Look for unformatted placeholders
    const unformattedMatches = markdown.match(UNFORMATTED_PLACEHOLDER_PATTERN);
    if (unformattedMatches) {
      placeholders.push(...unformattedMatches);
    }
    
    return placeholders;
  }
  
  /**
   * Validate that delimiters are balanced in the output
   */
  private validateDelimiters(markdown: string): void {
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    const inlineDelimiter = this.options.inlineDelimiter;
    const blockDelimiter = this.options.blockDelimiter;
    
    const inlineCount = (markdown.match(new RegExp(escapeRegExp(inlineDelimiter), 'g')) || []).length;
    const blockCount = (markdown.match(new RegExp(escapeRegExp(blockDelimiter), 'g')) || []).length;
    
    if (inlineCount % 2 !== 0) {
      this.logger.warn(`Detected unbalanced inline delimiters: ${inlineCount} occurrences of '${inlineDelimiter}'`);
    } else {
      this.logger.debug(`Inline delimiters are balanced: ${inlineCount} occurrences of '${inlineDelimiter}'`);
    }
    
    if (blockCount % 2 !== 0) {
      this.logger.warn(`Detected unbalanced block delimiters: ${blockCount} occurrences of '${blockDelimiter}'`);
    } else {
      this.logger.debug(`Block delimiters are balanced: ${blockCount} occurrences of '${blockDelimiter}'`);
    }
  }
}