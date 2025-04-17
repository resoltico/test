import { JSDOM } from 'jsdom';
import { MathConverter } from './base.js';
import { ConversionContext } from '../../../types/modules/math.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for MathML format
 * This converts MathML to LaTeX in a generic way without hardcoded formulas
 */
export class MathMLConverter extends MathConverter {
  // Mapping for common MathML elements to LaTeX
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
   * Convert MathML to LaTeX format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting MathML to LaTeX`);
      
      // Try to parse the MathML
      try {
        const dom = new JSDOM(`<div>${content}</div>`);
        const mathElement = dom.window.document.querySelector('math');
        
        if (!mathElement) {
          throw new Error('No math element found in MathML');
        }
        
        // Process the MathML recursively
        const latex = this.processMathNode(mathElement);
        
        // Post-process to ensure proper formatting
        const result = this.postProcessLatex(latex);
        this.logger.debug(`Successfully converted MathML to LaTeX: ${result}`);
        return result;
      } catch (parseError) {
        this.logger.error(`Error parsing MathML: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        
        // Fallback to basic MathML to LaTeX conversion
        return this.fallbackMathMLConversion(content);
      }
    } catch (error) {
      this.logger.error(`Error converting MathML to LaTeX: ${error instanceof Error ? error.message : String(error)}`);
      return this.cleanContent(content);
    }
  }
  
  /**
   * Process a math node recursively to convert it to LaTeX
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
        // Check if this is a display math
        const isDisplay = el.getAttribute('display') === 'block';
        const result = this.processChildNodes(el);
        return result;
      
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
      
      case 'mtext': // Text
        return `\\text{${el.textContent || ''}}`;
        
      case 'mspace': // Space
        return ' ';
        
      case 'mphantom': // Invisible element
        return '';
        
      case 'semantics': // Semantic annotations
        // Process first child only (usually the actual math)
        const semanticChild = Array.from(el.childNodes).find(node => 
          node.nodeType === 1 && 
          (node as Element).tagName.toLowerCase() !== 'annotation');
        
        if (semanticChild) {
          return this.processMathNode(semanticChild);
        }
        
        // Fallback: try to get content from annotation
        const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
        if (annotation) {
          return annotation.textContent || '';
        }
        
        return this.processChildNodes(el);
        
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
    
    // Check for single character Greek letters
    if (text.length === 1) {
      const greekLetters: Record<string, string> = {
        'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
        'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
        'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
        'ν': '\\nu', 'ξ': '\\xi', 'ο': 'o', 'π': '\\pi',
        'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon',
        'φ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
        'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
        'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon',
        'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega'
      };
      
      if (greekLetters[text]) {
        return greekLetters[text];
      }
      
      return text;
    }
    
    // Special handling for multi-letter identifiers
    // Common math functions that should not be in italics
    const mathFunctions = [
      'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
      'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
      'log', 'ln', 'exp', 'lim', 'inf', 'sup',
      'min', 'max', 'gcd', 'det'
    ];
    
    if (mathFunctions.includes(text.toLowerCase())) {
      return `\\${text}`;
    }
    
    // For variables with multiple letters, use \text to prevent italicizing each letter separately
    if (text.length > 1) {
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
    
    // Add proper spacing for binary operators
    if (['+', '-', '=', '<', '>', '≤', '≥', '≈', '≠', '∼', '∝'].includes(op)) {
      return ` ${op} `;
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
    // Get all rows
    const rows = Array.from(element.childNodes)
      .filter(n => n.nodeType === 1 && (n as Element).tagName.toLowerCase() === 'mtr');
    
    // Process each row
    const processedRows = rows.map(row => {
      // Get all cells in this row
      const cells = Array.from(row.childNodes)
        .filter(n => n.nodeType === 1 && ['mtd', 'mth'].includes((n as Element).tagName.toLowerCase()));
      
      // Process each cell
      return cells.map(cell => this.processMathNode(cell)).join(' & ');
    });
    
    // Create a matrix
    return `\\begin{pmatrix}${processedRows.join(' \\\\ ')}\\end{pmatrix}`;
  }
  
  /**
   * Post-process the LaTeX to ensure proper formatting
   */
  private postProcessLatex(latex: string): string {
    // Ensure proper spacing for operators
    let result = latex
      .replace(/([0-9])([+\-*/=])/g, '$1 $2 ')
      .replace(/([+\-*/=])([0-9])/g, '$1 $2')
      // Remove unnecessary spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    return result;
  }
  
  /**
   * Basic fallback conversion for when parsing fails
   */
  private fallbackMathMLConversion(mathml: string): string {
    // Extract text content from tags
    const textContent = mathml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check for fraction patterns
    if (mathml.includes('<mfrac>') || mathml.includes('</mfrac>')) {
      // Try to extract numerator and denominator
      const numPattern = /<mrow>([^<]+)<\/mrow>/;
      const denomPattern = /<mrow>([^<]+)<\/mrow>[^<]*<\/mfrac>/;
      
      const numMatch = mathml.match(numPattern);
      const denomMatch = mathml.match(denomPattern);
      
      if (numMatch && denomMatch) {
        return `\\frac{${numMatch[1].trim()}}{${denomMatch[1].trim()}}`;
      }
    }
    
    // Try to clean up the text content to make it more LaTeX-like
    return textContent
      .replace(/×/g, '\\cdot ')
      .replace(/√/g, '\\sqrt')
      .replace(/∑/g, '\\sum')
      .replace(/∫/g, '\\int')
      .replace(/π/g, '\\pi')
      .replace(/∞/g, '\\infty');
  }
}