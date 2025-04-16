import { Logger } from '../../shared/logger/console.js';
import { MathExtractor, MathExtractorOptions } from './extractor.js';
import { MathRestorer, MathRestorerOptions } from './restorer.js';

/**
 * Options for the math processor
 */
export interface MathProcessorOptions extends MathExtractorOptions, MathRestorerOptions {
  /**
   * Whether to preserve original math content in a data attribute
   */
  preserveOriginal: boolean;
}

/**
 * Math processing result
 */
export interface MathProcessingResult {
  /**
   * The HTML with math content extracted and replaced with placeholders
   */
  html: string;
  
  /**
   * Function to restore math content in Markdown
   */
  restoreMarkdown: (markdown: string) => Promise<string>;
  
  /**
   * Debug info - for troubleshooting
   */
  debug?: {
    placeholderCount: number;
    placeholders: string[];
  };
}

/**
 * Math processor that uses a placeholder-based approach
 * to handle math content during HTML to Markdown conversion
 */
export class MathProcessor {
  private options: MathProcessorOptions;
  private extractor: MathExtractor;
  private restorer: MathRestorer;
  
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
    
    // Create extractor and restorer
    this.extractor = new MathExtractor(logger, this.options);
    this.restorer = new MathRestorer(logger, this.options);
    
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
      
      // Extract math content and replace with placeholders
      const extraction = this.extractor.extract(html);
      
      // For debugging
      const placeholders = Array.from(extraction.placeholderMap.keys());
      this.logger.debug(`Extracted ${placeholders.length} math elements with placeholders`);
      placeholders.forEach(placeholder => {
        this.logger.debug(`Placeholder: ${placeholder}`);
      });
      
      // Return the HTML with placeholders and a function to restore the Markdown
      return {
        html: extraction.html,
        restoreMarkdown: async (markdown: string) => {
          this.logger.debug(`Restoring ${placeholders.length} math placeholders in Markdown`);
          return this.restorer.restore(markdown, extraction.placeholderMap);
        },
        debug: {
          placeholderCount: placeholders.length,
          placeholders
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
   * Process HTML directly and return with math content extracted and formatted
   * This is a convenience method for direct processing without using placeholders
   */
  async preprocessHtml(html: string): Promise<string> {
    try {
      // Process the HTML
      const result = await this.process(html);
      
      // Convert the HTML with placeholders back to markdown
      const turndownService = require('turndown');
      const td = new turndownService();
      const markdown = td.turndown(result.html);
      
      // Restore the math content in the markdown
      const processedMarkdown = await result.restoreMarkdown(markdown);
      
      // Convert the processed markdown back to HTML
      // This would require a markdown-to-HTML converter, which isn't included
      // For now, we'll just return the original HTML with a warning
      this.logger.warn('Direct HTML preprocessing is not fully implemented');
      return html;
    } catch (error) {
      this.logger.error('Error during direct HTML preprocessing');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      return html;
    }
  }
}