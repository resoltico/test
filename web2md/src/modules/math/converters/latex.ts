import { JSDOM } from 'jsdom';
import { MathConverter, ConversionContext } from './base.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for LaTeX format
 */
export class LaTeXConverter extends MathConverter {
  // Mapping for special operators
  private readonly operatorMap: Record<string, string> = {
    '×': '\\cdot',
    '⋅': '\\cdot',
    '·': '\\cdot',
    '≤': '\\leq',
    '≥': '\\geq',
    '±': '\\pm',
    '→': '\\rightarrow',
    '←': '\\leftarrow',
    '↔': '\\leftrightarrow',
    '∑': '\\sum',
    '∏': '\\prod',
    '∫': '\\int',
    '∈': '\\in',
    '∉': '\\notin',
    '⊂': '\\subset',
    '⊃': '\\supset',
    '∞': '\\infty',
    '∀': '\\forall',
    '∃': '\\exists',
    '∧': '\\wedge',
    '∨': '\\vee',
    '⇒': '\\Rightarrow',
    '⇔': '\\Leftrightarrow'
  };
  
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert to LaTeX format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting ${context.sourceFormat} to LaTeX`);
      
      // If the source is already LaTeX, just clean it up
      if (context.sourceFormat === 'latex') {
        return this.cleanLatex(content);
      }
      
      // Convert from MathML to LaTeX
      if (context.sourceFormat === 'mathml') {
        return this.convertMathMLToLaTeX(content);
      }
      
      // Convert from ASCII to LaTeX
      if (context.sourceFormat === 'ascii') {
        return this.convertASCIIToLaTeX(content);
      }
      
      // Default: return the cleaned content
      return this.cleanContent(content);
    } catch (error) {
      this.logger.error(`Error converting to LaTeX: ${error instanceof Error ? error.message : String(error)}`);
      return this.cleanContent(content);
    }
  }
  
  /**
   * Clean and normalize LaTeX
   */
  private cleanLatex(latex: string): string {
    // Clean HTML entities
    let cleaned = this.cleanContent(latex);
    
    // Remove excessive curly braces
    cleaned = cleaned
      .replace(/\{\s*([a-zA-Z0-9])\s*\}/g, '$1') // Replace {x} with x for single characters
      .replace(/\{\s*\\([a-zA-Z]+)\s*\}/g, '\\$1') // Replace {\alpha} with \alpha
      .replace(/\\\s+/g, '\\') // Remove spaces after backslashes
      .replace(/\s*\^\s*/g, '^') // Normalize spacing around ^
      .replace(/\s*\_\s*/g, '_'); // Normalize spacing around _
    
    return cleaned;
  }
  
  /**
   * Convert MathML to LaTeX
   */
  private convertMathMLToLaTeX(mathml: string): string {
    try {
      // Parse the MathML
      const dom = new JSDOM(`<div>${mathml}</div>`);
      const mathElement = dom.window.document.querySelector('math');
      
      if (!mathElement) {
        throw new Error('No math element found in MathML');
      }
      
      // Process the MathML recursively
      return this.processMathNode(mathElement);
    } catch (error) {
      this.logger.error(`Error converting MathML to LaTeX: ${error instanceof Error ? error.message : String(error)}`);
      return this.cleanContent(mathml);
    }
  }
  
  /**
   * Process a math node recursively
   */
  private processMathNode(node: Node): string {
    // Text node - just return the text
    if (node.nodeType === 3) { // Node.TEXT_NODE
      return (node.textContent || '').trim();
    }
    
    // Not an element node
    if (node.nodeType !== 1) { // Node.ELEMENT_NODE
      return '';
    }
    
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();
    
    switch (tagName) {
      case 'math':
        return this.processChildNodes(el);
      
      case 'mrow':
        return this.processChildNodes(el);
      
      case 'mi': // Identifier
        return this.processIdentifier(el);
      
      case 'mn': // Number
        return el.textContent || '';
      
      case 'mo': // Operator
        return this.processOperator(el);
      
      case 'mfrac': // Fraction
        return this.processFraction(el);
      
      case 'msup': // Superscript
        return this.processSuperscript(el);
      
      case 'msub': // Subscript
        return this.processSubscript(el);
      
      case 'msubsup': // Both subscript and superscript
        return this.processSubSup(el);
      
      case 'msqrt': // Square root
        return this.processSqrt(el);
      
      case 'mroot': // nth root
        return this.processRoot(el);
      
      case 'mfenced': // Fenced expression
        return this.processFenced(el);
      
      case 'mtable': // Table/matrix
        return this.processTable(el);
      
      case 'mtr': // Table row
        return this.processTableRow(el);
      
      case 'mtd': // Table cell
      case 'mth': // Table header cell
        return this.processChildNodes(el);
      
      case 'mover': // Overscript
        return this.processOver(el);
      
      case 'munder': // Underscript
        return this.processUnder(el);
      
      case 'munderover': // Both under and overscript
        return this.processUnderOver(el);
      
      default:
        // For unknown elements, just process children
        return this.processChildNodes(el);
    }
  }
  
  /**
   * Process all child nodes
   */
  private processChildNodes(element: Element): string {
    return Array.from(element.childNodes)
      .map(child => this.processMathNode(child))
      .join('');
  }
  
  /**
   * Process an identifier
   */
  private processIdentifier(element: Element): string {
    const text = element.textContent || '';
    
    // Special handling for multi-letter identifiers
    if (text.length > 1) {
      // Check if it's a known function
      const knownFunctions = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min'];
      if (knownFunctions.includes(text)) {
        return `\\${text}`;
      }
      
      // Otherwise, treat as a regular multi-letter identifier
      return `\\text{${text}}`;
    }
    
    return text;
  }
  
  /**
   * Process an operator
   */
  private processOperator(element: Element): string {
    const op = element.textContent || '';
    
    // Check for special operators
    if (op in this.operatorMap) {
      return this.operatorMap[op];
    }
    
    return op;
  }
  
  /**
   * Process a fraction
   */
  private processFraction(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const num = this.processMathNode(children[0]);
      const den = this.processMathNode(children[1]);
      return `\\frac{${num}}{${den}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process a superscript
   */
  private processSuperscript(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const exp = this.processMathNode(children[1]);
      
      // Special case for single character exponents
      if (exp.length === 1) {
        return `${base}^${exp}`;
      }
      
      return `${base}^{${exp}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process a subscript
   */
  private processSubscript(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const sub = this.processMathNode(children[1]);
      
      // Special case for single character subscripts
      if (sub.length === 1) {
        return `${base}_${sub}`;
      }
      
      return `${base}_{${sub}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process a subscript and superscript
   */
  private processSubSup(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 3) {
      const base = this.processMathNode(children[0]);
      const sub = this.processMathNode(children[1]);
      const sup = this.processMathNode(children[2]);
      
      return `${base}_{${sub}}^{${sup}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process a square root
   */
  private processSqrt(element: Element): string {
    const content = this.processChildNodes(element);
    return `\\sqrt{${content}}`;
  }
  
  /**
   * Process an nth root
   */
  private processRoot(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const index = this.processMathNode(children[1]);
      return `\\sqrt[${index}]{${base}}`;
    }
    
    return `\\sqrt{${this.processChildNodes(element)}}`;
  }
  
  /**
   * Process a fenced expression
   */
  private processFenced(element: Element): string {
    const open = element.getAttribute('open') || '(';
    const close = element.getAttribute('close') || ')';
    const content = this.processChildNodes(element);
    
    // Map common fence characters to LaTeX
    const mapFence = (fence: string): string => {
      if (fence === '(') return '\\left(';
      if (fence === ')') return '\\right)';
      if (fence === '[') return '\\left[';
      if (fence === ']') return '\\right]';
      if (fence === '{') return '\\left\\{';
      if (fence === '}') return '\\right\\}';
      if (fence === '|') return '\\left|';
      if (fence === '‖') return '\\left\\|';
      return fence;
    };
    
    return `${mapFence(open)}${content}${mapFence(close)}`;
  }
  
  /**
   * Process a table/matrix
   */
  private processTable(element: Element): string {
    const rows = Array.from(element.childNodes)
      .filter(n => n.nodeType === 1 && (n as Element).tagName.toLowerCase() === 'mtr')
      .map(row => this.processMathNode(row));
    
    return `\\begin{matrix}${rows.join('\\\\')}\\end{matrix}`;
  }
  
  /**
   * Process a table row
   */
  private processTableRow(element: Element): string {
    const cells = Array.from(element.childNodes)
      .filter(n => n.nodeType === 1 && ['mtd', 'mth'].includes((n as Element).tagName.toLowerCase()))
      .map(cell => this.processMathNode(cell));
    
    return cells.join('&');
  }
  
  /**
   * Process an overscript
   */
  private processOver(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const over = this.processMathNode(children[1]);
      
      // Special case for common accents
      if (over === '̂' || over === '^') return `\\hat{${base}}`;
      if (over === '̃' || over === '~') return `\\tilde{${base}}`;
      if (over === '̄' || over === '-') return `\\bar{${base}}`;
      if (over === '→') return `\\overrightarrow{${base}}`;
      if (over === '←') return `\\overleftarrow{${base}}`;
      if (over === '.') return `\\dot{${base}}`;
      if (over === '..') return `\\ddot{${base}}`;
      
      return `\\overset{${over}}{${base}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process an underscript
   */
  private processUnder(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const under = this.processMathNode(children[1]);
      
      return `\\underset{${under}}{${base}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process an underscript and overscript
   */
  private processUnderOver(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 3) {
      const base = this.processMathNode(children[0]);
      const under = this.processMathNode(children[1]);
      const over = this.processMathNode(children[2]);
      
      // Special case for sum, product, integral
      if (base === '∑' || base === '\\sum') {
        return `\\sum_{${under}}^{${over}}`;
      }
      if (base === '∏' || base === '\\prod') {
        return `\\prod_{${under}}^{${over}}`;
      }
      if (base === '∫' || base === '\\int') {
        return `\\int_{${under}}^{${over}}`;
      }
      
      return `\\underset{${under}}{\\overset{${over}}{${base}}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Convert ASCII math to LaTeX
   * This is a simplified implementation - a full implementation would need a proper parser
   */
  private convertASCIIToLaTeX(ascii: string): string {
    // Clean the input
    let content = this.cleanContent(ascii);
    
    // This is a very basic conversion
    // A full implementation would use a proper ASCIIMath parser
    
    // Convert some basic ASCIIMath syntax to LaTeX
    content = content
      // Fractions
      .replace(/(\w+)\/(\w+)/g, '\\frac{$1}{$2}')
      
      // Superscripts
      .replace(/(\w)\^(\w+)/g, '$1^{$2}')
      
      // Subscripts
      .replace(/(\w)_(\w+)/g, '$1_{$2}')
      
      // Square roots
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      
      // Basic functions
      .replace(/sin/g, '\\sin')
      .replace(/cos/g, '\\cos')
      .replace(/tan/g, '\\tan')
      .replace(/log/g, '\\log')
      .replace(/ln/g, '\\ln')
      
      // Greek letters
      .replace(/alpha/g, '\\alpha')
      .replace(/beta/g, '\\beta')
      .replace(/gamma/g, '\\gamma')
      .replace(/delta/g, '\\delta')
      .replace(/epsilon/g, '\\epsilon')
      .replace(/theta/g, '\\theta')
      .replace(/pi/g, '\\pi');
    
    return content;
  }
}