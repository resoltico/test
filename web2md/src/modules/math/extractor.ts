import { JSDOM } from 'jsdom';
import { Logger } from '../../shared/logger/console.js';
import { MathFormatDetector } from './detector.js';

/**
 * Placeholder format to use in the HTML
 * Using a distinctive format that won't be confused with regular content
 */
export const PLACEHOLDER_FORMAT = '%%MATH_PLACEHOLDER_%d%%';

/**
 * Interface for a math extraction result
 */
export interface MathExtraction {
  /**
   * Map of placeholders to their original math content
   */
  placeholderMap: Map<string, {
    content: string;
    isDisplay: boolean;
    format: string;
  }>;
  
  /**
   * The processed HTML with placeholders
   */
  html: string;
}

/**
 * Options for the math extractor
 */
export interface MathExtractorOptions {
  /**
   * Delimiter for inline math
   */
  inlineDelimiter: string;
  
  /**
   * Delimiter for block math
   */
  blockDelimiter: string;
  
  /**
   * Custom element selectors to identify math content
   */
  selectors: Record<string, string>;
}

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
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Create a map for placeholders
      const placeholderMap = new Map<string, {
        content: string;
        isDisplay: boolean;
        format: string;
      }>();
      
      // Collect all elements to process
      const elementsToProcess = this.collectMathElements(document);
      this.logger.debug(`Found ${elementsToProcess.length} total math elements to extract`);
      
      // Process each element
      for (const {element, format} of elementsToProcess) {
        this.extractMathElement(element, format, placeholderMap, document);
      }
      
      // Get the processed HTML
      const processedHtml = dom.serialize();
      
      this.logger.debug(`Extracted ${placeholderMap.size} math elements and created placeholders`);
      
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
  
  /**
   * Collect all math elements from the document
   */
  private collectMathElements(document: Document): Array<{element: Element, format: string}> {
    const results: Array<{element: Element, format: string}> = [];
    const selectors = this.options.selectors;
    
    // Function to process elements and detect format
    const processElements = (selector: string, defaultFormat: string) => {
      if (!selector) return;
      
      try {
        const elements = document.querySelectorAll(selector);
        this.logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          // Detect the format, defaulting if not detectable
          const format = this.formatDetector.detectFormat(element) || defaultFormat;
          results.push({element, format});
        }
      } catch (error) {
        this.logger.error(`Error processing selector "${selector}": ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // Process each selector type - with null checks
    if (selectors.mathml) {
      processElements(selectors.mathml, 'mathml');
    }
    
    if (selectors.scripts) {
      processElements(selectors.scripts, 'latex');
    }
    
    if (selectors.dataAttributes) {
      processElements(selectors.dataAttributes, 'latex');
    }
    
    if (selectors.classes) {
      processElements(selectors.classes, 'latex');
    }
    
    if (selectors.attributes) {
      processElements(selectors.attributes, 'latex');
    }
    
    return results;
  }
  
  /**
   * Extract a single math element and replace with a placeholder
   * Pass the document parameter instead of using global document
   */
  private extractMathElement(
    element: Element, 
    format: string, 
    placeholderMap: Map<string, {content: string; isDisplay: boolean; format: string}>,
    document: Document
  ): void {
    try {
      // Determine if display mode (block vs inline)
      const isDisplay = this.detectDisplayMode(element);
      
      // Get the content based on element type and format
      const content = this.extractContent(element, format);
      
      // Skip if no content
      if (!content) {
        return;
      }
      
      // Generate a unique placeholder ID
      const placeholderId = this.generatePlaceholder();
      
      // Store the math content in the map
      placeholderMap.set(placeholderId, {
        content,
        isDisplay,
        format
      });
      
      // Create a special wrapper element that Turndown won't mess with
      // Important: Use the document passed as parameter, not the global document
      const wrapper = document.createElement('span');
      wrapper.className = 'math-placeholder-wrapper';
      wrapper.setAttribute('data-math-placeholder', 'true');
      
      // Create a special text format with markers that Turndown won't touch
      wrapper.textContent = `${placeholderId}`;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(wrapper, element);
      }
      
      this.logger.debug(`Extracted math element and created placeholder: ${placeholderId}`);
    } catch (error) {
      this.logger.error(`Error extracting math element: ${error instanceof Error ? error.message : String(error)}`);
      // Skip this element if there's an error
    }
  }
  
  /**
   * Extract content from an element based on format
   */
  private extractContent(element: Element, format: string): string {
    // Check element type first
    if (format === 'mathml' && element.nodeName.toLowerCase() === 'math') {
      return element.outerHTML;
    }
    
    // Try multiple ways to extract content - in order of preference
    
    // 1. Check for data attributes with format-specific content
    if (element.hasAttribute(`data-${format}`)) {
      return element.getAttribute(`data-${format}`) || '';
    }
    
    // 2. Check for plain 'data-math' attribute
    if (element.hasAttribute('data-math')) {
      return element.getAttribute('data-math') || '';
    }
    
    // 3. For script elements, use text content
    if (element.nodeName.toLowerCase() === 'script') {
      return element.textContent || '';
    }
    
    // 4. Look for a specific format attribute
    if (element.hasAttribute(format)) {
      return element.getAttribute(format) || '';
    }
    
    // 5. Try 'math' attribute if it exists
    if (element.hasAttribute('math')) {
      return element.getAttribute('math') || '';
    }
    
    // 6. Fall back to textContent if all else fails
    return element.textContent || '';
  }
  
  /**
   * Determine if an element should be displayed in block mode
   * Using multiple signals to increase accuracy
   */
  private detectDisplayMode(element: Element): boolean {
    // 1. Explicit attribute indicators
    if (element.getAttribute('display') === 'block' || 
        element.getAttribute('data-display') === 'block' ||
        element.getAttribute('data-math-display') === 'block') {
      return true;
    }
    
    // 2. Class indicators
    if (element.classList.contains('display-math') || 
        element.classList.contains('math-display') ||
        element.classList.contains('block') ||
        element.classList.contains('equation')) {
      return true;
    }
    
    // 3. Script with mode=display
    if (element.nodeName.toLowerCase() === 'script' && 
        element.getAttribute('type')?.includes('mode=display')) {
      return true;
    }
    
    // 4. MathML specifics
    if (element.nodeName.toLowerCase() === 'math' && 
        (element.getAttribute('display') === 'block' || element.getAttribute('mode') === 'display')) {
      return true;
    }
    
    // 5. Element type and style context
    if (['div', 'p', 'figure', 'center'].includes(element.nodeName.toLowerCase())) {
      return true;
    }
    
    // 6. Check parent element
    const parent = element.parentElement;
    if (parent && ['div', 'p', 'figure', 'center'].includes(parent.nodeName.toLowerCase()) &&
        (parent.childNodes.length === 1 || parent.classList.contains('math-container'))) {
      return true;
    }
    
    // 7. Check if the element is alone on its line
    if (element.previousSibling === null && element.nextSibling === null) {
      return true;
    }
    
    // Default to inline
    return false;
  }
}