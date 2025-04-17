import { JSDOM } from 'jsdom';
import { Logger } from '../../../shared/logger/console.js';
import { MathFormatDetector } from '../detector.js';
import { MathExtraction, MathExtractorOptions } from '../../../types/modules/math.js';
import { PLACEHOLDER_FORMAT } from './placeholder.js';
import { collectMathElements } from './collector.js';
import { extractMathElement } from './element-extractor.js';

/**
 * Extracts math content from HTML and replaces it with placeholders
 */
export class MathExtractor {
  private options: MathExtractorOptions;
  private formatDetector: MathFormatDetector;
  private nextPlaceholderId: number = 1;
  
  constructor(
    private logger: Logger,
    options?: Partial<MathExtractorOptions>
  ) {
    // Default options
    this.options = {
      inlineDelimiter: '$',
      blockDelimiter: '$$',
      selectors: {
        mathml: 'math',
        scripts: 'script[type*="math/tex"], script[type*="math/asciimath"]',
        dataAttributes: '[data-math], [data-latex], [data-mathml], [data-asciimath]',
        classes: '.math, .tex, .latex, .asciimath, .equation',
        attributes: '[math], [latex], [tex], [asciimath]'
      },
      ...options
    };
    
    // Create format detector
    this.formatDetector = new MathFormatDetector(logger);
    
    this.logger.debug('Math extractor initialized with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Configure the extractor with new options
   */
  configure(options: Partial<MathExtractorOptions>): void {
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
    
    this.logger.debug('Math extractor reconfigured with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Generate a unique placeholder ID
   */
  generatePlaceholder(): string {
    return PLACEHOLDER_FORMAT.replace('%d', String(this.nextPlaceholderId++));
  }
  
  /**
   * Extract math content from HTML and replace with placeholders
   */
  extract(html: string): MathExtraction {
    try {
      this.logger.debug('Extracting math content from HTML');
      
      // Reset placeholder counter
      this.nextPlaceholderId = 1;
      
      // Parse the HTML
      const dom = new JSDOM(html, {
        contentType: 'text/html',
      });
      const document = dom.window.document;
      
      // Create a map for placeholders
      const placeholderMap = new Map<string, {
        content: string;
        isDisplay: boolean;
        format: string;
      }>();
      
      // Collect all elements to process
      const elementsToProcess = collectMathElements(document, this.options, this.formatDetector, this.logger);
      this.logger.debug(`Found ${elementsToProcess.length} total math elements to extract`);
      
      if (elementsToProcess.length === 0) {
        // No math elements found, return the original HTML
        return {
          placeholderMap,
          html
        };
      }
      
      // Process each element
      for (const {element, format} of elementsToProcess) {
        const placeholderId = this.generatePlaceholder();
        extractMathElement(element, format, placeholderId, placeholderMap, document, this.logger);
      }
      
      // Get the processed HTML
      const processedHtml = dom.serialize();
      
      this.logger.debug(`Extracted ${placeholderMap.size} math elements and created placeholders`);
      
      // Log statistics about display vs. inline equations
      let displayCount = 0;
      let inlineCount = 0;
      placeholderMap.forEach(info => {
        if (info.isDisplay) displayCount++;
        else inlineCount++;
      });
      
      this.logger.debug(`Math breakdown: ${displayCount} display equations, ${inlineCount} inline equations`);
      
      return {
        placeholderMap,
        html: processedHtml
      };
    } catch (error) {
      this.logger.error('Error extracting math from HTML');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Return the original HTML if processing fails
      return {
        placeholderMap: new Map(),
        html
      };
    }
  }
}