import { Logger } from '../../shared/logger/console.js';
import { MathExtractor } from './extractor.js';
import { MathRestorer } from './restorer.js';
import { MathProcessorOptions, MathProcessingResult } from '../../types/modules/math.js';
import { MathConverterFactory } from './converters/factory.js';

/**
 * Math processor that uses a placeholder-based approach
 * to handle math content during HTML to Markdown conversion
 */
export class MathProcessor {
  private options: MathProcessorOptions;
  private extractor: MathExtractor;
  private restorer: MathRestorer;
  private converterFactory: MathConverterFactory;
  
  constructor(
    private logger: Logger,
    options?: Partial<MathProcessorOptions>
  ) {
    // Default options
    this.options = {
      inlineDelimiter: '$',
      blockDelimiter: '$$',
      preserveOriginal: true,
      outputFormat: 'latex',
      selectors: {
        mathml: 'math',
        scripts: 'script[type*="math/tex"], script[type*="math/asciimath"]',
        dataAttributes: '[data-math], [data-latex], [data-mathml], [data-asciimath]',
        classes: '.math, .tex, .latex, .asciimath, .equation',
        attributes: '[math], [latex], [tex], [asciimath]'
      },
      ...options
    };
    
    // Initialize the converter factory
    this.converterFactory = new MathConverterFactory(logger);
    
    // Create extractor and restorer
    this.extractor = new MathExtractor(logger, this.options);
    this.restorer = new MathRestorer(logger, this.options, this.converterFactory);
    
    this.logger.debug('Math processor initialized with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Configure the processor with new options
   */
  configure(options: Partial<MathProcessorOptions>): void {
    // Merge new options with existing ones
    this.options = {
      ...this.options,
      ...options,
      // Merge nested objects properly
      selectors: {
        ...this.options.selectors,
        ...(options.selectors || {})
      }
    };
    
    // Update extractor and restorer with new options
    this.extractor.configure(this.options);
    this.restorer.configure(this.options);
    
    this.logger.debug('Math processor reconfigured with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Process HTML for math content using a placeholder-based approach
   */
  async process(html: string): Promise<MathProcessingResult> {
    try {
      this.logger.debug('Processing HTML for math content');
      
      // Verify input is not empty
      if (!html || html.trim().length === 0) {
        this.logger.debug('Empty HTML content, skipping math processing');
        return {
          html,
          restoreMarkdown: async (markdown: string) => markdown,
          debug: {
            placeholderCount: 0,
            placeholders: []
          }
        };
      }
      
      // Pre-process HTML to protect non-math dollar signs
      html = this.preProcessDollarSigns(html);
      
      // Extract math content and replace with placeholders
      const extraction = this.extractor.extract(html);
      const placeholderCount = extraction.placeholderMap.size;
      
      if (placeholderCount === 0) {
        this.logger.debug('No math elements detected in the HTML');
        return {
          html,
          restoreMarkdown: async (markdown: string) => markdown,
          debug: {
            placeholderCount: 0,
            placeholders: []
          }
        };
      }
      
      // For debugging
      const placeholders = Array.from(extraction.placeholderMap.keys());
      this.logger.debug(`Extracted ${placeholders.length} math elements with placeholders`);
      
      // Log statistics about display vs. inline equations
      let displayCount = 0;
      let inlineCount = 0;
      for (const [_, info] of extraction.placeholderMap.entries()) {
        if (info.isDisplay) displayCount++;
        else inlineCount++;
      }
      this.logger.debug(`Found ${displayCount} display equations and ${inlineCount} inline equations`);
      
      // Return the HTML with placeholders and a function to restore the Markdown
      return {
        html: extraction.html,
        restoreMarkdown: async (markdown: string) => {
          this.logger.debug(`Restoring ${placeholders.length} math placeholders in Markdown`);
          const restored = await this.restorer.restore(markdown, extraction.placeholderMap);
          
          // Perform final validation on the restored markdown
          this.validateRestoration(restored, placeholders, extraction.placeholderMap);
          
          return restored;
        },
        debug: {
          placeholderCount: placeholders.length,
          placeholders,
          displayCount,
          inlineCount
        }
      };
    } catch (error) {
      this.logger.error('Error processing HTML for math content');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Return the original HTML if processing fails
      return {
        html,
        restoreMarkdown: async (markdown: string) => markdown,
        debug: {
          placeholderCount: 0,
          placeholders: []
        }
      };
    }
  }
  
  /**
   * Pre-process HTML to protect certain dollar signs that aren't part of math formulas
   * This helps avoid issues with unbalanced delimiters
   */
  private preProcessDollarSigns(html: string): string {
    // Protect dollar signs in specific contexts that aren't math
    
    // 1. Currency values (e.g., $100)
    html = html.replace(/\$(\d+(\.\d+)?)/g, '&#36;$1');
    
    // 2. Dollar signs in code blocks/samples
    const codeTagRegex = /<code[^>]*>([^<]*\$[^<]*)<\/code>/g;
    html = html.replace(codeTagRegex, (match, content) => {
      // Replace dollar signs with entities within code tags
      return match.replace(/\$/g, '&#36;');
    });
    
    // 3. Dollar signs in pre tags
    const preTagRegex = /<pre[^>]*>([^]*?)<\/pre>/g;
    html = html.replace(preTagRegex, (match) => {
      // Replace dollar signs with entities within pre tags
      return match.replace(/\$/g, '&#36;');
    });
    
    return html;
  }
  
  /**
   * Validate the restoration process
   */
  private validateRestoration(
    markdown: string, 
    originalPlaceholders: string[], 
    placeholderMap: Map<string, {isDisplay: boolean; format: string; content: string}>
  ): void {
    // Check for remaining placeholders
    const remainingPlaceholders = markdown.match(/%%MATH_PLACEHOLDER_\d+%%/g);
    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      this.logger.warn(`Validation warning: ${remainingPlaceholders.length} placeholders still present in output`);
      
      // Log some details about the unreplaced placeholders
      for (const placeholder of remainingPlaceholders.slice(0, 3)) {
        const info = placeholderMap.get(placeholder);
        if (info) {
          this.logger.debug(`Unreplaced placeholder ${placeholder}: ${info.format}, display=${info.isDisplay}`);
        }
      }
    }
    
    // Check for balanced delimiters
    const inlineDelimiter = this.options.inlineDelimiter;
    const blockDelimiter = this.options.blockDelimiter;
    
    // Look for unescaped delimiters (not preceded by backslash)
    const unescapedInlinePattern = new RegExp(`(?<!\\\\)${this.escapeRegExp(inlineDelimiter)}`, 'g');
    const unescapedBlockPattern = new RegExp(`(?<!\\\\)${this.escapeRegExp(blockDelimiter)}`, 'g');
    
    const inlineDelimiterCount = (markdown.match(unescapedInlinePattern) || []).length;
    const blockDelimiterCount = (markdown.match(unescapedBlockPattern) || []).length;
    
    // We should have an even number of each delimiter
    if (inlineDelimiterCount % 2 !== 0) {
      this.logger.warn(`Validation warning: Unbalanced inline delimiters (${inlineDelimiterCount} occurrences)`);
    }
    
    if (blockDelimiterCount % 2 !== 0) {
      this.logger.warn(`Validation warning: Unbalanced block delimiters (${blockDelimiterCount} occurrences)`);
    }
    
    // Check for expected delimiter counts based on math type
    const expectedInlineDelimiters = Array.from(placeholderMap.values())
      .filter(info => !info.isDisplay)
      .length * 2; // × 2 because each inline math has two delimiters
      
    const expectedBlockDelimiters = Array.from(placeholderMap.values())
      .filter(info => info.isDisplay)
      .length * 2; // × 2 because each block math has two delimiters
    
    if (inlineDelimiterCount !== expectedInlineDelimiters) {
      this.logger.debug(`Inline delimiter count mismatch: expected ${expectedInlineDelimiters}, found ${inlineDelimiterCount}`);
    }
    
    if (blockDelimiterCount !== expectedBlockDelimiters) {
      this.logger.debug(`Block delimiter count mismatch: expected ${expectedBlockDelimiters}, found ${blockDelimiterCount}`);
    }
  }
  
  /**
   * Escape special regex characters in a string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Manually process math elements directly (for testing/debugging)
   */
  async manuallyProcessMath(mathml: string, isDisplay: boolean): Promise<string> {
    const converter = this.converterFactory.createConverter('mathml');
    if (!converter) {
      throw new Error('MathML converter not available');
    }
    
    const context = {
      sourceFormat: 'mathml',
      isDisplay,
      options: {
        inlineDelimiter: this.options.inlineDelimiter,
        blockDelimiter: this.options.blockDelimiter,
        outputFormat: this.options.outputFormat,
        protectLatex: true
      }
    };
    
    const latex = await converter.convert(mathml, context);
    const delimiter = isDisplay ? this.options.blockDelimiter : this.options.inlineDelimiter;
    
    if (isDisplay) {
      return `\n\n${delimiter}${latex}${delimiter}\n\n`;
    } else {
      return `${delimiter}${latex}${delimiter}`;
    }
  }
}