import { JSDOM } from 'jsdom';
import { Logger } from '../../shared/logger/console.js';
import { MathConverterFactory } from './converters/factory.js';
import { MathFormatDetector } from './detector.js';

/**
 * Options for the math processor
 */
export interface MathProcessorOptions {
  /**
   * Delimiter for inline math
   */
  inlineDelimiter: string;
  
  /**
   * Delimiter for block math
   */
  blockDelimiter: string;
  
  /**
   * Whether to preserve original math content in a data attribute
   */
  preserveOriginal: boolean;
  
  /**
   * Format to use for math output
   */
  outputFormat: string;
  
  /**
   * Custom element selectors to identify math content
   */
  selectors: Record<string, string>;
  
  /**
   * Custom placeholder for fallback content
   */
  fallbackTemplate: string;
}

/**
 * Improved math processor that uses a plugin architecture
 * for handling different math formats
 */
export class MathProcessor {
  private options: MathProcessorOptions;
  private converterFactory: MathConverterFactory;
  private formatDetector: MathFormatDetector;
  
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
      fallbackTemplate: '{delim}{content}{delim}',
      ...options
    };
    
    // Create converter factory and format detector
    this.converterFactory = new MathConverterFactory(logger);
    this.formatDetector = new MathFormatDetector(logger);
    
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
    
    this.logger.debug('Math processor reconfigured with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Preprocesses HTML to handle math elements
   * This is run before Turndown processing
   */
  async preprocessHtml(html: string): Promise<string> {
    try {
      this.logger.debug('Preprocessing HTML for math elements');
      
      // Parse the HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Collect all elements to process
      const elementsToProcess = this.collectMathElements(document);
      this.logger.debug(`Found ${elementsToProcess.length} total math elements to process`);
      
      // Process each element
      for (const {element, format} of elementsToProcess) {
        await this.processMathElement(element, format);
      }
      
      return dom.serialize();
    } catch (error) {
      this.logger.error('Error preprocessing HTML for math elements');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Return the original HTML if processing fails
      return html;
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
      const elements = document.querySelectorAll(selector);
      this.logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        // Detect the format, defaulting if not detectable
        const format = this.formatDetector.detectFormat(element) || defaultFormat;
        results.push({element, format});
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
   * Process a single math element
   */
  private async processMathElement(element: Element, sourceFormat: string): Promise<void> {
    try {
      // Determine if display mode (block vs inline)
      const isDisplay = this.detectDisplayMode(element);
      
      // Get the content based on element type and format
      const content = this.extractContent(element, sourceFormat);
      
      // Skip if no content
      if (!content) {
        return;
      }
      
      // Get target format and create converter
      const outputFormat = this.options.outputFormat.toLowerCase();
      const converter = this.converterFactory.createConverter(outputFormat);
      
      if (!converter) {
        throw new Error(`No converter available for format: ${outputFormat}`);
      }
      
      // Configure context with options
      const context = {
        sourceFormat,
        isDisplay,
        element,
        options: {
          inlineDelimiter: this.options.inlineDelimiter,
          blockDelimiter: this.options.blockDelimiter
        }
      };
      
      // Convert the content
      const convertedContent = await converter.convert(content, context);
      
      // Create a replacement element - use a span for inline, div for block
      const tagName = isDisplay ? 'div' : 'span';
      const replacementElement = element.ownerDocument.createElement(tagName);
      
      // Apply CSS classes for better flexibility
      replacementElement.className = isDisplay ? 'math-block' : 'math-inline';
      
      // Add data attributes for processing by the rule
      this.applyDataAttributes(replacementElement, {
        format: outputFormat,
        display: isDisplay ? 'block' : 'inline',
        inlineDelimiter: this.options.inlineDelimiter,
        blockDelimiter: this.options.blockDelimiter
      });
      
      // Preserve the original content if needed
      if (this.options.preserveOriginal) {
        this.applyDataAttributes(replacementElement, {
          original: content,
          originalFormat: sourceFormat
        });
      }
      
      // Set the content
      replacementElement.textContent = convertedContent;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(replacementElement, element);
      }
    } catch (error) {
      this.logger.error(`Error processing math element: ${error instanceof Error ? error.message : String(error)}`);
      this.handleProcessingError(element, sourceFormat, error);
    }
  }
  
  /**
   * Handle errors during math element processing by creating a fallback element
   */
  private handleProcessingError(element: Element, sourceFormat: string, error: unknown): void {
    try {
      const textContent = element.textContent || '';
      const isDisplay = this.detectDisplayMode(element);
      const delimiter = isDisplay ? this.options.blockDelimiter : this.options.inlineDelimiter;
      
      // Create a fallback using the template (with null check)
      let fallbackContent = this.options.fallbackTemplate
        .replace('{delim}', delimiter)
        .replace('{content}', this.cleanText(textContent));
      
      // Create appropriate fallback element
      const tagName = isDisplay ? 'div' : 'span';
      const fallbackElement = element.ownerDocument.createElement(tagName);
      fallbackElement.className = isDisplay ? 'math-block math-fallback' : 'math-inline math-fallback';
      
      // Apply data attributes
      this.applyDataAttributes(fallbackElement, {
        format: 'text',
        fallback: 'true',
        display: isDisplay ? 'block' : 'inline',
        inlineDelimiter: this.options.inlineDelimiter,
        blockDelimiter: this.options.blockDelimiter,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      fallbackElement.textContent = fallbackContent;
      
      if (element.parentNode) {
        element.parentNode.replaceChild(fallbackElement, element);
      }
    } catch (fallbackError) {
      this.logger.error('Fallback processing also failed for math element');
    }
  }
  
  /**
   * Apply multiple data attributes to an element
   */
  private applyDataAttributes(element: Element, attributes: Record<string, string | boolean>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(`data-math-${key}`, String(value));
    });
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
  
  /**
   * Clean up text content
   */
  private cleanText(text: string): string {
    return text
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