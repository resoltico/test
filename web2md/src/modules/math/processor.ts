import { JSDOM } from 'jsdom';
import { Logger } from '../../shared/logger/console.js';
import { MathConverter } from './converters/base.js';
import { LaTeXConverter } from './converters/latex.js';
import { MathMLConverter } from './converters/mathml.js';
import { ASCIIMathConverter } from './converters/ascii.js';

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
  selectors?: {
    mathml?: string;
    scripts?: string;
    dataAttributes?: string;
  };
}

/**
 * Generic processor for handling math content
 * Uses a converter-based approach to support multiple formats
 */
export class MathProcessor {
  private options: MathProcessorOptions;
  private converters: Map<string, MathConverter> = new Map();
  
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
        dataAttributes: '[data-math], [data-latex], [data-mathml], [data-asciimath]'
      },
      ...options
    };
    
    // Register default converters
    this.registerConverter('latex', new LaTeXConverter(logger));
    this.registerConverter('mathml', new MathMLConverter(logger));
    this.registerConverter('ascii', new ASCIIMathConverter(logger));
    
    this.logger.debug('Math processor initialized with options:');
    this.logger.debug(JSON.stringify(this.options, null, 2));
  }
  
  /**
   * Register a converter for a specific format
   */
  registerConverter(format: string, converter: MathConverter): void {
    this.converters.set(format.toLowerCase(), converter);
    this.logger.debug(`Registered math converter for format: ${format}`);
  }
  
  /**
   * Get a converter for a specific format
   */
  getConverter(format: string): MathConverter | undefined {
    return this.converters.get(format.toLowerCase());
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
      
      // Process different types of math elements
      await this.processMathMLElements(document);
      await this.processMathScripts(document);
      await this.processMathDataElements(document);
      
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
   * Process all MathML elements in the document
   */
  private async processMathMLElements(document: Document): Promise<void> {
    const selector = this.options.selectors?.mathml || 'math';
    const mathElements = document.querySelectorAll(selector);
    this.logger.debug(`Found ${mathElements.length} MathML elements using selector: ${selector}`);
    
    for (let i = 0; i < mathElements.length; i++) {
      const element = mathElements[i];
      await this.processMathElement(element, 'mathml');
    }
  }
  
  /**
   * Process all script elements with math content
   */
  private async processMathScripts(document: Document): Promise<void> {
    const selector = this.options.selectors?.scripts || 
                     'script[type*="math/tex"], script[type*="math/asciimath"]';
    const mathScripts = document.querySelectorAll(selector);
    this.logger.debug(`Found ${mathScripts.length} math script elements using selector: ${selector}`);
    
    for (let i = 0; i < mathScripts.length; i++) {
      const element = mathScripts[i];
      const type = (element.getAttribute('type') || '').toLowerCase();
      
      // Determine the format based on script type
      let format = 'latex';
      if (type.includes('math/tex')) {
        format = 'latex';
      } else if (type.includes('math/asciimath')) {
        format = 'ascii';
      }
      
      await this.processMathElement(element, format);
    }
  }
  
  /**
   * Process all elements with math data attributes
   */
  private async processMathDataElements(document: Document): Promise<void> {
    const selector = this.options.selectors?.dataAttributes || 
                     '[data-math], [data-latex], [data-mathml], [data-asciimath]';
    const mathDataElements = document.querySelectorAll(selector);
    this.logger.debug(`Found ${mathDataElements.length} elements with math data attributes using selector: ${selector}`);
    
    for (let i = 0; i < mathDataElements.length; i++) {
      const element = mathDataElements[i];
      
      // Determine the format based on data attributes
      let format = 'latex';
      if (element.hasAttribute('data-mathml')) {
        format = 'mathml';
      } else if (element.hasAttribute('data-asciimath')) {
        format = 'ascii';
      } else if (element.hasAttribute('data-latex')) {
        format = 'latex';
      } else if (element.hasAttribute('data-math')) {
        format = 'latex'; // Default for data-math
      }
      
      await this.processMathElement(element, format);
    }
  }
  
  /**
   * Process a single math element
   */
  private async processMathElement(element: Element, sourceFormat: string): Promise<void> {
    try {
      // Determine if display mode (block vs inline)
      const isDisplay = this.isDisplayMode(element);
      
      // Get the content based on element type and format
      const content = this.extractContent(element, sourceFormat);
      
      // Skip if no content
      if (!content) {
        return;
      }
      
      // Convert content to target format
      const outputFormat = this.options.outputFormat.toLowerCase();
      const converter = this.getConverter(outputFormat);
      
      if (!converter) {
        this.logger.warn(`No converter found for format: ${outputFormat}`);
        return;
      }
      
      // Convert the content 
      const convertedContent = await converter.convert(content, {
        sourceFormat,
        isDisplay,
        element
      });
      
      // Create a replacement element
      const replacementElement = element.ownerDocument.createElement('div');
      replacementElement.className = isDisplay ? 'math-block' : 'math-inline';
      replacementElement.setAttribute('data-math-format', outputFormat);
      
      // Preserve the original content if needed
      if (this.options.preserveOriginal) {
        replacementElement.setAttribute('data-math-original', content);
        replacementElement.setAttribute('data-math-original-format', sourceFormat);
      }
      
      // Add display mode attribute
      replacementElement.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
      
      // Add delimiters to attributes for the rule to use
      replacementElement.setAttribute('data-math-inline-delimiter', this.options.inlineDelimiter);
      replacementElement.setAttribute('data-math-block-delimiter', this.options.blockDelimiter);
      
      // Set the content
      replacementElement.textContent = convertedContent;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(replacementElement, element);
      }
    } catch (error) {
      this.logger.error(`Error processing math element: ${error instanceof Error ? error.message : String(error)}`);
      
      // Create a fallback element
      try {
        const textContent = element.textContent || '';
        const isDisplay = this.isDisplayMode(element);
        
        const fallbackElement = element.ownerDocument.createElement('div');
        fallbackElement.className = isDisplay ? 'math-block' : 'math-inline';
        fallbackElement.setAttribute('data-math-format', 'text');
        fallbackElement.setAttribute('data-math-fallback', 'true');
        fallbackElement.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
        fallbackElement.setAttribute('data-math-inline-delimiter', this.options.inlineDelimiter);
        fallbackElement.setAttribute('data-math-block-delimiter', this.options.blockDelimiter);
        fallbackElement.textContent = this.cleanText(textContent);
        
        if (element.parentNode) {
          element.parentNode.replaceChild(fallbackElement, element);
        }
      } catch (fallbackError) {
        this.logger.error('Fallback processing also failed for math element');
      }
    }
  }
  
  /**
   * Extract content from an element based on format
   */
  private extractContent(element: Element, format: string): string {
    if (format === 'mathml' && element.nodeName.toLowerCase() === 'math') {
      return element.outerHTML;
    }
    
    // Check for data attributes first
    if (element.hasAttribute(`data-${format}`)) {
      return element.getAttribute(`data-${format}`) || '';
    }
    
    // For script elements, use text content
    if (element.nodeName.toLowerCase() === 'script') {
      return element.textContent || '';
    }
    
    // Default to textContent
    return element.textContent || '';
  }
  
  /**
   * Determine if an element should be displayed in block mode
   */
  private isDisplayMode(element: Element): boolean {
    // Check for explicit display mode indicators
    if (element.getAttribute('display') === 'block') {
      return true;
    }
    
    if (element.classList.contains('display-math')) {
      return true;
    }
    
    // Script with mode=display
    if (element.nodeName.toLowerCase() === 'script' && 
        element.getAttribute('type')?.includes('mode=display')) {
      return true;
    }
    
    // Divs are typically block level
    if (element.nodeName.toLowerCase() === 'div') {
      return true;
    }
    
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