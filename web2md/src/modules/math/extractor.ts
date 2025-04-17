import { JSDOM } from 'jsdom';
import { Logger } from '../../shared/logger/console.js';
import { MathFormatDetector } from './detector.js';
import { MathExtraction, MathExtractorOptions } from '../../types/modules/math.js';

/**
 * Placeholder format to use in the HTML
 * Using a distinctive format that won't be confused with regular content
 */
export const PLACEHOLDER_FORMAT = '%%MATH_PLACEHOLDER_%d%%';

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
      const elementsToProcess = this.collectMathElements(document);
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
        this.extractMathElement(element, format, placeholderMap, document);
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
  
  /**
   * Collect all math elements from the document
   */
  private collectMathElements(document: Document): Array<{element: Element, format: string}> {
    const results: Array<{element: Element, format: string}> = [];
    const selectors = this.options.selectors;
    const seenElements = new Set<Element>(); // Track elements we've already processed
    
    // Function to process elements and detect format
    const processElements = (selector: string, defaultFormat: string) => {
      if (!selector) return;
      
      try {
        const elements = document.querySelectorAll(selector);
        this.logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          
          // Skip if we've already processed this element
          if (seenElements.has(element)) continue;
          seenElements.add(element);
          
          // Skip empty elements
          if (!element.textContent || element.textContent.trim() === '') continue;
          
          // Skip elements that don't look like math
          if (this.shouldSkipElement(element)) continue;
          
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
   * Determine if we should skip this element (e.g., not actual math)
   */
  private shouldSkipElement(element: Element): boolean {
    // Skip elements in <head>
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName.toLowerCase() === 'head') {
        return true;
      }
      parent = parent.parentElement;
    }
    
    // For script elements, check if they look like math
    if (element.tagName.toLowerCase() === 'script') {
      const type = element.getAttribute('type') || '';
      if (!type.includes('math/') && !type.includes('tex') && !type.includes('latex')) {
        return true;
      }
      
      // Skip empty scripts
      const content = element.textContent || '';
      if (!content.trim()) {
        return true;
      }
    }
    
    // Always process <math> elements
    if (element.tagName.toLowerCase() === 'math') {
      return false;
    }
    
    // Check content for elements with data attributes
    const hasDataAttr = 
      element.hasAttribute('data-math') || 
      element.hasAttribute('data-latex') || 
      element.hasAttribute('data-mathml') || 
      element.hasAttribute('data-asciimath');
    
    if (hasDataAttr) {
      // Get the attribute value
      const attrValue = 
        element.getAttribute('data-math') || 
        element.getAttribute('data-latex') || 
        element.getAttribute('data-mathml') || 
        element.getAttribute('data-asciimath') || '';
      
      // Skip if empty
      if (!attrValue.trim()) {
        return true;
      }
      
      // Quick check for math-like content
      const hasMathSymbols = /[+\-*/=^_{}\\]/.test(attrValue);
      if (!hasMathSymbols) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Extract a single math element and replace with a placeholder
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
      
      // Create a special wrapper element that won't be altered during Markdown conversion
      const wrapper = document.createElement('span');
      wrapper.className = 'math-placeholder-wrapper';
      wrapper.setAttribute('data-math-placeholder', 'true');
      wrapper.setAttribute('data-math-format', format);
      wrapper.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
      
      // Create a special text format with markers that won't be changed
      wrapper.textContent = `${placeholderId}`;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(wrapper, element);
      }
      
      this.logger.debug(`Extracted math element (${format}, ${isDisplay ? 'block' : 'inline'}) and created placeholder: ${placeholderId}`);
    } catch (error) {
      this.logger.error(`Error extracting math element: ${error instanceof Error ? error.message : String(error)}`);
      // Skip this element if there's an error
    }
  }
  
  /**
   * Extract content from an element based on format
   */
  private extractContent(element: Element, format: string): string {
    // MathML elements - preserve the entire element
    if (format === 'mathml' && element.nodeName.toLowerCase() === 'math') {
      return element.outerHTML;
    }
    
    // Try multiple extraction methods in order of preference
    
    // 1. Check for format-specific data attributes
    if (element.hasAttribute(`data-${format}`)) {
      return element.getAttribute(`data-${format}`) || '';
    }
    
    // 2. Check for general math data attribute
    if (element.hasAttribute('data-math')) {
      return element.getAttribute('data-math') || '';
    }
    
    // 3. For script elements, use text content
    if (element.nodeName.toLowerCase() === 'script') {
      return element.textContent || '';
    }
    
    // 4. Check for format attribute
    if (element.hasAttribute(format)) {
      return element.getAttribute(format) || '';
    }
    
    // 5. Check for math attribute
    if (element.hasAttribute('math')) {
      return element.getAttribute('math') || '';
    }
    
    // 6. For MathML-containing elements that are not <math> themselves
    const mathChild = element.querySelector('math');
    if (mathChild) {
      return mathChild.outerHTML;
    }
    
    // 7. Fallback to element's text content
    return element.textContent || '';
  }
  
  /**
   * Determine if an element should be displayed in block mode
   * This uses a variety of heuristics without hardcoding specific cases
   */
  private detectDisplayMode(element: Element): boolean {
    // Get document context for more accurate analysis
    const document = element.ownerDocument;
    
    // First check for explicit display mode indicators
    if (element.getAttribute('display') === 'block' || 
        element.getAttribute('data-display') === 'block' ||
        element.getAttribute('data-math-display') === 'block') {
      return true;
    }
    
    // Check for class indicators
    if (element.classList.contains('display-math') || 
        element.classList.contains('math-display') ||
        element.classList.contains('block') ||
        element.classList.contains('equation')) {
      return true;
    }
    
    // Check script type for display mode
    if (element.nodeName.toLowerCase() === 'script') {
      const type = element.getAttribute('type') || '';
      if (type.includes('mode=display')) {
        return true;
      }
      
      // Check for display style in the content
      const content = element.textContent || '';
      if (content.includes('\\displaystyle')) {
        return true;
      }
    }
    
    // Check MathML display attribute
    if (element.nodeName.toLowerCase() === 'math' && 
        (element.getAttribute('display') === 'block' || element.getAttribute('mode') === 'display')) {
      return true;
    }
    
    // STRUCTURAL CONTEXT ANALYSIS
    
    // 1. Check if element is a block level element itself
    const isBlockElement = ['div', 'p', 'figure', 'center', 'section', 'article'].includes(
      element.nodeName.toLowerCase()
    );
    if (isBlockElement) {
      return true;
    }
    
    // 2. Check if element is the only significant child of a block element
    const parent = element.parentElement;
    if (parent) {
      const isBlockParent = ['div', 'p', 'figure', 'center', 'section', 'article'].includes(
        parent.nodeName.toLowerCase()
      );
      
      if (isBlockParent) {
        // Count significant siblings (ignore text nodes with only whitespace)
        let significantSiblings = 0;
        for (let i = 0; i < parent.childNodes.length; i++) {
          const child = parent.childNodes[i];
          // Skip text nodes that are just whitespace
          if (child.nodeType === 3 && child.textContent?.trim() === '') {
            continue;
          }
          significantSiblings++;
        }
        
        // If this element is the only significant child, treat as block
        if (significantSiblings === 1) {
          return true;
        }
      }
    }
    
    // 3. Check for spacing context - if element is surrounded by blank lines
    let prevSibling = element.previousSibling;
    let nextSibling = element.nextSibling;
    
    // Skip whitespace text nodes
    while (prevSibling && prevSibling.nodeType === 3 && prevSibling.textContent?.trim() === '') {
      prevSibling = prevSibling.previousSibling;
    }
    
    while (nextSibling && nextSibling.nodeType === 3 && nextSibling.textContent?.trim() === '') {
      nextSibling = nextSibling.nextSibling;
    }
    
    // If no significant siblings, likely a standalone block
    if (!prevSibling || !nextSibling) {
      return true;
    }
    
    // If surrounded by block breaks, likely a block display
    const blockElements = ['DIV', 'P', 'BR', 'SECTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE'];
    
    const isPrevBlock = prevSibling.nodeName && blockElements.includes(
      prevSibling.nodeName.toUpperCase()
    );
    
    const isNextBlock = nextSibling.nodeName && blockElements.includes(
      nextSibling.nodeName.toUpperCase()
    );
    
    if (isPrevBlock && isNextBlock) {
      return true;
    }
    
    // 4. Content-based heuristics - more complex equations are more likely to be block displayed
    const content = element.textContent || '';
    
    // Check for equation environment markers
    if (content.includes('\\begin{align') || 
        content.includes('\\begin{equation') || 
        content.includes('\\begin{gather') ||
        content.includes('\\begin{multline')) {
      return true;
    }
    
    // Check for complex layout that suggests a display equation
    if (content.includes('\\frac') || 
        content.includes('\\sum') || 
        content.includes('\\int') ||
        content.includes('\\prod')) {
      return true;
    }
    
    // If the content is relatively long, it's more likely to be a display equation
    if (content.length > 30 && 
        (content.includes('\\') || content.includes('_') || content.includes('^'))) {
      return true;
    }
    
    // 5. Check for semantic context (if within a paragraph vs. standalone)
    // For MathML, get the parent text content without this element
    if (element.nodeName.toLowerCase() === 'math') {
      const parent = element.parentElement;
      if (parent) {
        // Clone parent to avoid modifying the DOM
        const clonedParent = parent.cloneNode(true) as Element;
        
        // Find and remove this math element from the clone
        const clonedMath = clonedParent.querySelector('math');
        if (clonedMath) {
          clonedMath.parentNode?.removeChild(clonedMath);
        }
        
        // Check if there's substantial text around the math
        const surroundingText = clonedParent.textContent || '';
        if (surroundingText.trim().length < 10) {
          // Little text around the math, likely a display equation
          return true;
        }
      }
    }
    
    // 6. Check if inside a heading or list item - these are typically inline
    let ancestor = element.parentElement;
    while (ancestor) {
      const tagName = ancestor.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'th', 'td'].includes(tagName)) {
        // Math in headings and list items is typically inline
        return false;
      }
      ancestor = ancestor.parentElement;
    }
    
    // Default to inline math if no block indicators found
    return false;
  }
}