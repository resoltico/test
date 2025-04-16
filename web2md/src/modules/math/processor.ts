import * as mathjax from 'mathjax-node';
import { JSDOM } from 'jsdom';
import { Logger } from '../../shared/logger/console.js';

// We'll use direct MathML parsing as a fallback since MathJax is having issues
let mathjaxAvailable = false;

try {
  // Initialize MathJax with less ambitious configuration
  mathjax.config({
    MathJax: {
      menuSettings: {
        texHints: true,
        semantics: false,
        zoom: 'None'
      },
      tex2jax: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      },
      displayAlign: 'center',
      showProcessingMessages: false,
      messageStyle: 'none'
    }
  });
  
  // Start MathJax
  mathjax.start();
  mathjaxAvailable = true;
} catch (error) {
  console.error('Failed to initialize MathJax:', error);
  mathjaxAvailable = false;
}

/**
 * Options for the math processor
 */
export interface MathProcessorOptions {
  inlineDelimiter: string;
  blockDelimiter: string;
}

/**
 * Processor for handling math content
 * Focuses on converting MathML to LaTeX
 */
export class MathProcessor {
  private options: MathProcessorOptions;
  
  constructor(
    private logger: Logger,
    options?: Partial<MathProcessorOptions>
  ) {
    this.options = {
      inlineDelimiter: '$',
      blockDelimiter: '$$',
      ...options
    };
    
    // Log MathJax availability
    if (mathjaxAvailable) {
      this.logger.debug('MathJax initialized successfully');
    } else {
      this.logger.warn('MathJax initialization failed, using fallback processing');
    }
  }
  
  /**
   * Configure the processor with new options
   */
  configure(options: Partial<MathProcessorOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
  
  /**
   * Preprocesses HTML to convert MathML to LaTeX
   * This is run before Turndown processing
   */
  async preprocessHtml(html: string): Promise<string> {
    try {
      this.logger.debug('Preprocessing HTML for math elements');
      
      // Parse the HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Find all MathML elements
      const mathElements = document.querySelectorAll('math');
      this.logger.debug(`Found ${mathElements.length} MathML elements`);
      
      // Process each MathML element
      for (let i = 0; i < mathElements.length; i++) {
        const element = mathElements[i];
        await this.processMathElement(element);
      }
      
      // Find all script elements with math content
      const mathScripts = document.querySelectorAll(
        'script[type*="math/tex"], script[type*="math/asciimath"]'
      );
      this.logger.debug(`Found ${mathScripts.length} math script elements`);
      
      // Process each math script
      for (let i = 0; i < mathScripts.length; i++) {
        const element = mathScripts[i];
        await this.processMathScript(element);
      }
      
      // Find elements with math data attributes
      const mathDataElements = document.querySelectorAll(
        '[data-math], [data-latex], [data-mathml], [data-asciimath]'
      );
      this.logger.debug(`Found ${mathDataElements.length} elements with math data attributes`);
      
      // Process each element with math data
      for (let i = 0; i < mathDataElements.length; i++) {
        const element = mathDataElements[i];
        await this.processMathDataElement(element);
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
   * Process a MathML element
   */
  private async processMathElement(element: Element): Promise<void> {
    try {
      // Get the MathML content
      const mathml = element.outerHTML;
      
      // Skip if mathml is too short or doesn't look valid
      if (!mathml || mathml.length < 10 || !mathml.includes('<math')) {
        this.logger.debug('Skipping invalid MathML element');
        return;
      }
      
      // Determine if display mode
      const isDisplay = element.getAttribute('display') === 'block';
      
      // Skip MathJax conversion and use direct parsing
      // This is more reliable than MathJax for now
      const latex = this.directMathMLToLatex(element);
      
      // Create a replacement element
      const replacementElement = element.ownerDocument.createElement('div');
      replacementElement.className = isDisplay ? 'math-block' : 'math-inline';
      replacementElement.setAttribute('data-math-format', 'latex');
      replacementElement.setAttribute('data-math-original', 'mathml');
      replacementElement.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
      replacementElement.textContent = latex;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(replacementElement, element);
      }
    } catch (error) {
      this.logger.error('Error processing MathML element');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Create a fallback element with just the text content
      try {
        // Extract basic content as fallback
        const textContent = element.textContent || '';
        const isDisplay = element.getAttribute('display') === 'block';
        
        // Create a fallback element
        const fallbackElement = element.ownerDocument.createElement('div');
        fallbackElement.className = isDisplay ? 'math-block' : 'math-inline';
        fallbackElement.setAttribute('data-math-format', 'latex');
        fallbackElement.setAttribute('data-math-original', 'mathml');
        fallbackElement.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
        fallbackElement.setAttribute('data-math-fallback', 'true');
        
        // Use extracted text content as simple fallback
        fallbackElement.textContent = this.cleanMathContent(textContent);
        
        // Replace the original element
        if (element.parentNode) {
          element.parentNode.replaceChild(fallbackElement, element);
        }
      } catch (fallbackError) {
        // If even fallback fails, log and continue
        this.logger.error('Fallback processing also failed for MathML element');
      }
    }
  }
  
  /**
   * Process a script element with math content
   */
  private async processMathScript(element: Element): Promise<void> {
    try {
      const type = (element.getAttribute('type') || '').toLowerCase();
      const content = element.textContent || '';
      
      // Skip if content is empty
      if (!content.trim()) {
        return;
      }
      
      // Determine the format and display mode
      let format = 'tex';
      let isDisplay = false;
      
      if (type.includes('math/tex')) {
        format = 'tex';
        isDisplay = type.includes('mode=display');
      } else if (type.includes('math/asciimath')) {
        format = 'asciimath';
        isDisplay = false; // AsciiMath is typically inline
      }
      
      // Process the content - just use it directly for now
      let processedContent = content;
      
      // Create a replacement element
      const replacementElement = element.ownerDocument.createElement('div');
      replacementElement.className = isDisplay ? 'math-block' : 'math-inline';
      replacementElement.setAttribute('data-math-format', 'latex');
      replacementElement.setAttribute('data-math-original', format);
      replacementElement.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
      replacementElement.textContent = processedContent;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(replacementElement, element);
      }
    } catch (error) {
      this.logger.error('Error processing math script element');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // If processing fails, leave the element as-is
    }
  }
  
  /**
   * Process an element with math data attributes
   */
  private async processMathDataElement(element: Element): Promise<void> {
    try {
      let content = '';
      let format = 'latex';
      
      // Extract content and format from data attributes
      if (element.hasAttribute('data-mathml')) {
        content = element.getAttribute('data-mathml') || '';
        format = 'mathml';
      } else if (element.hasAttribute('data-asciimath')) {
        content = element.getAttribute('data-asciimath') || '';
        format = 'asciimath';
      } else if (element.hasAttribute('data-latex')) {
        content = element.getAttribute('data-latex') || '';
        format = 'latex';
      } else if (element.hasAttribute('data-math')) {
        content = element.getAttribute('data-math') || '';
        format = 'latex'; // Assume LaTeX for data-math
      }
      
      // Skip if no content
      if (!content) {
        return;
      }
      
      // Determine display mode
      const isDisplay = element.classList.contains('display-math') || 
                       element.nodeName.toLowerCase() === 'div';
      
      // Process the content - for now just use it directly
      let processedContent = content;
      
      // Create a replacement element
      const replacementElement = element.ownerDocument.createElement('div');
      replacementElement.className = isDisplay ? 'math-block' : 'math-inline';
      replacementElement.setAttribute('data-math-format', 'latex');
      replacementElement.setAttribute('data-math-original', format);
      replacementElement.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
      replacementElement.textContent = processedContent;
      
      // Replace the original element
      if (element.parentNode) {
        element.parentNode.replaceChild(replacementElement, element);
      }
    } catch (error) {
      this.logger.error('Error processing element with math data attributes');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // If processing fails, leave the element as-is
    }
  }
  
  /**
   * Direct MathML to LaTeX conversion without using MathJax
   * This is more reliable for simple cases
   */
  private directMathMLToLatex(element: Element): string {
    try {
      // Recursive function to process MathML elements
      const processNode = (node: Node): string => {
        // Text node - just return the text
        if (node.nodeType === node.TEXT_NODE) {
          return node.textContent || '';
        }
        
        // Not an element node
        if (node.nodeType !== node.ELEMENT_NODE) {
          return '';
        }
        
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        
        // Process based on tag name
        switch (tagName) {
          case 'math':
            return Array.from(el.childNodes).map(processNode).join('');
            
          case 'mrow':
            return Array.from(el.childNodes).map(processNode).join('');
            
          case 'mi': // Identifier
            return el.textContent || '';
            
          case 'mn': // Number
            return el.textContent || '';
            
          case 'mo': // Operator
            {
              const op = el.textContent || '';
              // Special operators
              if (op === '×' || op === '⋅' || op === '·') return '\\cdot';
              if (op === '≤') return '\\leq';
              if (op === '≥') return '\\geq';
              if (op === '±') return '\\pm';
              if (op === '→') return '\\rightarrow';
              if (op === '←') return '\\leftarrow';
              if (op === '∑') return '\\sum';
              if (op === '∏') return '\\prod';
              if (op === '∫') return '\\int';
              if (op === '∈') return '\\in';
              if (op === '∉') return '\\notin';
              if (op === '⊂') return '\\subset';
              if (op === '⊃') return '\\supset';
              return op;
            }
            
          case 'mfrac': // Fraction
            {
              const children = Array.from(el.childNodes).filter(n => n.nodeType === n.ELEMENT_NODE);
              if (children.length >= 2) {
                const num = processNode(children[0]);
                const den = processNode(children[1]);
                return `\\frac{${num}}{${den}}`;
              }
              return Array.from(el.childNodes).map(processNode).join('/');
            }
            
          case 'msup': // Superscript
            {
              const children = Array.from(el.childNodes).filter(n => n.nodeType === n.ELEMENT_NODE);
              if (children.length >= 2) {
                const base = processNode(children[0]);
                const sup = processNode(children[1]);
                return `{${base}}^{${sup}}`;
              }
              return Array.from(el.childNodes).map(processNode).join('^');
            }
            
          case 'msub': // Subscript
            {
              const children = Array.from(el.childNodes).filter(n => n.nodeType === n.ELEMENT_NODE);
              if (children.length >= 2) {
                const base = processNode(children[0]);
                const sub = processNode(children[1]);
                return `{${base}}_{${sub}}`;
              }
              return Array.from(el.childNodes).map(processNode).join('_');
            }
            
          case 'msubsup': // Both subscript and superscript
            {
              const children = Array.from(el.childNodes).filter(n => n.nodeType === n.ELEMENT_NODE);
              if (children.length >= 3) {
                const base = processNode(children[0]);
                const sub = processNode(children[1]);
                const sup = processNode(children[2]);
                return `{${base}}_{${sub}}^{${sup}}`;
              }
              return Array.from(el.childNodes).map(processNode).join('');
            }
            
          case 'msqrt': // Square root
            return `\\sqrt{${Array.from(el.childNodes).map(processNode).join('')}}`;
            
          case 'mroot': // nth root
            {
              const children = Array.from(el.childNodes).filter(n => n.nodeType === n.ELEMENT_NODE);
              if (children.length >= 2) {
                const base = processNode(children[0]);
                const index = processNode(children[1]);
                return `\\sqrt[${index}]{${base}}`;
              }
              return `\\sqrt{${Array.from(el.childNodes).map(processNode).join('')}}`;
            }
            
          // Add more cases as needed for other MathML elements
          
          default:
            // For unknown elements, just process children
            return Array.from(el.childNodes).map(processNode).join('');
        }
      };
      
      // Start processing from the root element
      return processNode(element);
    } catch (error) {
      this.logger.error('Error in direct MathML to LaTeX conversion');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Return text content as fallback
      return this.cleanMathContent(element.textContent || '');
    }
  }
  
  /**
   * Clean up the math content to make it more LaTeX-like
   * Used for better fallback display
   */
  private cleanMathContent(content: string): string {
    // Convert common mathematical symbols to LaTeX notation
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
      .trim();
  }
  
  // Legacy methods kept for compatibility
  
  /**
   * Convert MathML to LaTeX - using MathJax (not used directly anymore)
   */
  async mathmlToLatex(mathml: string): Promise<string> {
    try {
      this.logger.debug('Converting MathML to LaTeX via MathJax');
      
      // Skip MathJax if not available
      if (!mathjaxAvailable) {
        this.logger.warn('MathJax not available, using direct conversion');
        
        // Create a temporary document to parse the MathML
        const dom = new JSDOM(`<div>${mathml}</div>`);
        const mathElement = dom.window.document.querySelector('math');
        
        if (mathElement) {
          return this.directMathMLToLatex(mathElement);
        } else {
          return this.simplifyMathml(mathml);
        }
      }
      
      // Ensure the mathml is properly formatted
      if (!mathml.startsWith('<math')) {
        mathml = `<math xmlns="http://www.w3.org/1998/Math/MathML">${mathml}</math>`;
      }
      
      // Try MathJax with simplified options
      try {
        const result = await mathjax.typeset({
          math: mathml,
          format: 'MathML'
        });
        
        if (!result.success) {
          throw new Error(`MathML processing failed: ${result.errors?.join(', ') || 'Unknown error'}`);
        }
        
        // We don't actually use the MathJax result
        this.logger.debug('MathJax conversion succeeded but not used');
      } catch (mathjaxError) {
        this.logger.error('MathJax conversion failed, switching to direct conversion');
        if (mathjaxError instanceof Error) {
          this.logger.debug(`MathJax error: ${mathjaxError.message}`);
        }
      }
      
      // Regardless of MathJax result, use our direct conversion
      const dom = new JSDOM(`<div>${mathml}</div>`);
      const mathElement = dom.window.document.querySelector('math');
      
      if (mathElement) {
        return this.directMathMLToLatex(mathElement);
      } else {
        return this.simplifyMathml(mathml);
      }
    } catch (error) {
      this.logger.error('Error converting MathML to LaTeX');
      if (error instanceof Error) {
        this.logger.debug(`Error details: ${error.message}`);
      }
      
      // Return a simplified version of the MathML as a fallback
      return this.simplifyMathml(mathml);
    }
  }
  
  /**
   * Convert AsciiMath to LaTeX (not used directly anymore)
   */
  async asciiMathToLatex(asciimath: string): Promise<string> {
    // Just return the AsciiMath as-is for now
    // A better solution would be to implement a proper AsciiMath parser
    return asciimath;
  }
  
  /**
   * Simplify MathML to basic text (fallback method)
   */
  private simplifyMathml(mathml: string): string {
    try {
      let simplified = mathml
        .replace(/<math[^>]*>([\s\S]*?)<\/math>/s, '$1')
        .replace(/<mrow>\s*([\s\S]*?)\s*<\/mrow>/g, '$1')
        .replace(/<mi>([^<]+)<\/mi>/g, '$1')
        .replace(/<mn>([^<]+)<\/mn>/g, '$1')
        .replace(/<mo>([^<]+)<\/mo>/g, '$1')
        .replace(/<mfrac>\s*<mn>(\d+)<\/mn>\s*<mn>(\d+)<\/mn>\s*<\/mfrac>/g, '$1/$2')
        .replace(/<msup>\s*<mi>([^<]+)<\/mi>\s*<mn>(\d+)<\/mn>\s*<\/msup>/g, '$1^$2')
        .replace(/<msub>\s*<mi>([^<]+)<\/mi>\s*<mn>(\d+)<\/mn>\s*<\/msub>/g, '$1_$2')
        .replace(/<msqrt>([\s\S]*?)<\/msqrt>/g, 'sqrt($1)')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
        
      return this.cleanMathContent(simplified);
    } catch (error) {
      // If even this fails, extract text content only
      return mathml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
}