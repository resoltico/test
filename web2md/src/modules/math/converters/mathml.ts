import { JSDOM } from 'jsdom';
import { MathConverter } from './base.js';
import { ConversionContext } from '../../../types/modules/math.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for MathML format to LaTeX
 * Uses a recursive approach to handle arbitrary MathML structures
 */
export class MathMLConverter extends MathConverter {
  // Mapping for common MathML operators to LaTeX
  private readonly operatorMap: Record<string, string> = {
    '×': '\\times',
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
    '∮': '\\oint',
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
    '⇔': '\\Leftrightarrow',
    '≠': '\\neq',
    '≈': '\\approx',
    '⊥': '\\perp',
    '∥': '\\parallel',
    '∂': '\\partial',
    '∇': '\\nabla',
    '∝': '\\propto',
    '⨯': '\\times',
    '⋂': '\\cap',
    '⋃': '\\cup'
  };
  
  // Common Greek letters
  private readonly greekLetters: Record<string, string> = {
    'α': '\\alpha',
    'β': '\\beta',
    'γ': '\\gamma',
    'δ': '\\delta',
    'ε': '\\epsilon',
    'ζ': '\\zeta',
    'η': '\\eta',
    'θ': '\\theta',
    'ι': '\\iota',
    'κ': '\\kappa',
    'λ': '\\lambda',
    'μ': '\\mu',
    'ν': '\\nu',
    'ξ': '\\xi',
    'ο': 'o', // Omicron looks like Latin 'o'
    'π': '\\pi',
    'ρ': '\\rho',
    'σ': '\\sigma',
    'τ': '\\tau',
    'υ': '\\upsilon',
    'φ': '\\phi',
    'χ': '\\chi',
    'ψ': '\\psi',
    'ω': '\\omega',
    'Α': 'A', // Latin equivalents for uppercase Greek letters that look the same
    'Β': 'B',
    'Γ': '\\Gamma',
    'Δ': '\\Delta',
    'Ε': 'E',
    'Ζ': 'Z',
    'Η': 'H',
    'Θ': '\\Theta',
    'Ι': 'I',
    'Κ': 'K',
    'Λ': '\\Lambda',
    'Μ': 'M',
    'Ν': 'N',
    'Ξ': '\\Xi',
    'Ο': 'O',
    'Π': '\\Pi',
    'Ρ': 'P',
    'Σ': '\\Sigma',
    'Τ': 'T',
    'Υ': '\\Upsilon',
    'Φ': '\\Phi',
    'Χ': 'X',
    'Ψ': '\\Psi',
    'Ω': '\\Omega'
  };
  
  // Common math functions that should not be in italics
  private readonly mathFunctions: string[] = [
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
    'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
    'log', 'ln', 'exp', 'lim', 'inf', 'sup',
    'min', 'max', 'gcd', 'lcm', 'det', 'dim',
    'ker', 'deg', 'arg', 'Pr', 'hom'
  ];
  
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert MathML to LaTeX format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting MathML to LaTeX`);
      
      // Quick check if content is already LaTeX
      if (content.trim().startsWith('\\') && !content.includes('<')) {
        return content;
      }
      
      // Check if it looks like MathML
      if (!content.includes('<math') && !content.includes('<mrow') && !content.includes('<mi')) {
        // Not MathML, return as is
        return content;
      }
      
      // Try to parse the MathML
      try {
        // Create a wrapper div to ensure we have a proper DOM structure
        // Use namespace-aware parsing for MathML
        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div>${content}</div></body></html>`, {
          contentType: 'text/html',
        });
        
        // Try to find the math element
        let mathElement = dom.window.document.querySelector('math');
        
        // If no math element was found directly, try to wrap content in math tags
        if (!mathElement) {
          // Check if we have partial MathML content without the outer math tag
          const hasPartialMathML = content.includes('<mrow') || content.includes('<mi') || content.includes('<mo');
          
          if (hasPartialMathML) {
            // Create a new JSDOM with wrapped content
            const wrappedDom = new JSDOM(`<!DOCTYPE html><html><head></head><body><math xmlns="http://www.w3.org/1998/Math/MathML">${content}</math></body></html>`, {
              contentType: 'text/html',
            });
            mathElement = wrappedDom.window.document.querySelector('math');
          }
        }
        
        if (!mathElement) {
          throw new Error('No math element found in content');
        }
        
        // Check if this is a display equation based on the math element attributes
        const isDisplayFromAttr = mathElement.getAttribute('display') === 'block' || 
                                 mathElement.getAttribute('mode') === 'display';
        
        // Use the display mode from the context if provided, otherwise use attribute
        const isDisplay = context.isDisplay !== undefined ? context.isDisplay : isDisplayFromAttr;
        
        // Process the MathML recursively
        const latex = this.processMathNode(mathElement);
        
        // Post-process to ensure proper formatting
        const result = this.postProcessLatex(latex);
        this.logger.debug(`Successfully converted MathML to LaTeX: ${result}`);
        
        return result;
      } catch (parseError) {
        this.logger.error(`Error parsing MathML: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        
        // Try a less strict parsing approach - extract the math element content using regex
        const mathMatch = content.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
        if (mathMatch && mathMatch[1]) {
          this.logger.debug('Attempting regex-based parsing of MathML content');
          return this.fallbackMathMLConversion(mathMatch[1]);
        }
        
        // Fallback to basic MathML to LaTeX conversion
        return this.fallbackMathMLConversion(content);
      }
    } catch (error) {
      this.logger.error(`Error converting MathML to LaTeX: ${error instanceof Error ? error.message : String(error)}`);
      // Return cleaned content with LaTeX escape sequences
      return this.cleanContent(content);
    }
  }
  
  /**
   * Process a math node recursively to convert it to LaTeX
   */
  private processMathNode(node: Node): string {
    // Text node - just return the text
    if (node.nodeType === 3) { // Node.TEXT_NODE
      const text = (node.textContent || '').trim();
      // Check if this is a Greek letter
      if (text.length === 1 && this.greekLetters[text]) {
        return this.greekLetters[text];
      }
      return text;
    }
    
    // Not an element node
    if (node.nodeType !== 1) { // Node.ELEMENT_NODE
      return '';
    }
    
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();
    
    // Handle each MathML element type
    switch (tagName) {
      case 'math':
        return this.processChildNodes(el);
      
      case 'mrow':
        return this.processChildNodes(el);
      
      case 'mi': // Identifier (variable)
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
      
      case 'mfenced': // Fenced expression (parentheses, brackets, etc.)
        return this.processFenced(el);
      
      case 'mtable': // Table/matrix
        return this.processTable(el);
      
      case 'mtr': // Table row
        return this.processTableRow(el);
      
      case 'mtd': // Table cell
        return this.processChildNodes(el);
      
      case 'mtext': // Text
        return `\\text{${el.textContent || ''}}`;
        
      case 'mspace': // Space
        const width = el.getAttribute('width');
        if (width) {
          // Convert width to appropriate LaTeX spacing
          if (width === 'verythinmathspace') return '\\,';
          if (width === 'thinmathspace') return '\\,';
          if (width === 'mediummathspace') return '\\:';
          if (width === 'thickmathspace') return '\\;';
          if (width === 'veryverythickmathspace') return '\\quad';
          if (width === 'verythickmathspace') return '\\quad';
          // Handle numeric widths
          if (width.includes('em')) {
            const em = parseFloat(width);
            if (em <= 0.16) return '\\,';
            if (em <= 0.22) return '\\:';
            if (em <= 0.28) return '\\;';
            return '\\quad';
          }
        }
        return ' ';
        
      case 'mphantom': // Invisible element (takes up space but not visible)
        return `\\phantom{${this.processChildNodes(el)}}`;
        
      case 'mstyle': // Styling
        return this.processChildNodes(el);
      
      case 'menclose': // Enclosed expression
        const notation = el.getAttribute('notation');
        const enclosed = this.processChildNodes(el);
        
        if (notation) {
          if (notation === 'box') return `\\boxed{${enclosed}}`;
          if (notation === 'circle') return `\\circled{${enclosed}}`;
          if (notation === 'roundedbox') return `\\boxed{${enclosed}}`;
          if (notation.includes('strike')) return `\\cancel{${enclosed}}`;
        }
        
        return enclosed;
        
      case 'mmultiscripts': // Complex scripts (sub, sup, pre-sub, pre-sup)
        return this.processMultiScripts(el);
        
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
        
      case 'annotation': // Annotation (metadata)
        // If it's a TeX annotation, use it directly
        if (el.getAttribute('encoding') === 'application/x-tex') {
          return el.textContent || '';
        }
        return '';
        
      case 'mpadded': // Padded expression
        return this.processChildNodes(el);
        
      case 'merror': // Error
        return this.processChildNodes(el);
        
      case 'maction': // Interactive action
        // Just process the selected child (usually the first)
        const selection = el.getAttribute('selection');
        const childIndex = selection ? parseInt(selection, 10) - 1 : 0;
        
        if (el.childNodes.length > childIndex) {
          return this.processMathNode(el.childNodes[childIndex]);
        }
        
        return this.processChildNodes(el);
        
      case 'mlabeledtr': // Labeled table row
        return this.processTableRow(el);
        
      case 'mover': // Overscript
        return this.processOverScript(el);
        
      case 'munder': // Underscript
        return this.processUnderScript(el);
        
      case 'munderover': // Both under and over scripts
        return this.processUnderOverScript(el);
        
      default:
        // For unknown elements, just process children
        this.logger.debug(`Unknown MathML element: ${tagName}`);
        return this.processChildNodes(el);
    }
  }
  
  /**
   * Process all child nodes of an element
   */
  private processChildNodes(element: Element): string {
    return Array.from(element.childNodes)
      .map(child => this.processMathNode(child))
      .join('');
  }
  
  /**
   * Process an identifier (variable)
   */
  private processIdentifier(element: Element): string {
    const text = element.textContent || '';
    
    // Check for single character Greek letters
    if (text.length === 1 && this.greekLetters[text]) {
      return this.greekLetters[text];
    }
    
    // Special handling for multi-letter identifiers
    // Common math functions that should not be in italics
    if (this.mathFunctions.includes(text.toLowerCase())) {
      return `\\${text}`;
    }
    
    // For variables with multiple letters, use \text to prevent italicizing each letter separately
    if (text.length > 1) {
      // Check if it might be a product of single-letter variables
      if (/^[a-zA-Z]*$/.test(text)) {
        // It's all Latin letters, so it's likely a product of variables
        return text;
      }
      
      // Otherwise use \text
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
    
    // Look for MathML operator attributes
    const form = element.getAttribute('form');
    const stretchy = element.getAttribute('stretchy');
    
    // Add proper spacing for binary operators
    if (['+', '-', '=', '<', '>', '≤', '≥', '≈', '≠', '∼', '∝'].includes(op)) {
      return ` ${op} `;
    }
    
    // Handle common large operators
    if (op === '∑') return '\\sum';
    if (op === '∏') return '\\prod';
    if (op === '∫') return '\\int';
    if (op === '∮') return '\\oint';
    
    // Handle stretchy delimiters
    if (stretchy === 'true') {
      if (op === '(') return '\\left(';
      if (op === ')') return '\\right)';
      if (op === '[') return '\\left[';
      if (op === ']') return '\\right]';
      if (op === '{') return '\\left\\{';
      if (op === '}') return '\\right\\}';
      if (op === '|') return '\\left|';
      if (op === '‖') return '\\left\\|';
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
    
    // Fallback: just process all children
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
      
      // Special case for single character exponents that are simple
      if (exp.length === 1 && /^[0-9a-zA-Z]$/.test(exp)) {
        return `${base}^${exp}`;
      }
      
      // For more complex exponents, use braces
      return `${base}^{${exp}}`;
    }
    
    // Fallback
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
      
      // Special case for single character subscripts that are simple
      if (sub.length === 1 && /^[0-9a-zA-Z]$/.test(sub)) {
        return `${base}_${sub}`;
      }
      
      // For more complex subscripts, use braces
      return `${base}_{${sub}}`;
    }
    
    // Fallback
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
    
    // Fallback
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
    
    // Fallback
    return `\\sqrt{${this.processChildNodes(element)}}`;
  }
  
  /**
   * Process a fenced expression (e.g., parentheses, brackets)
   */
  private processFenced(element: Element): string {
    const open = element.getAttribute('open') || '(';
    const close = element.getAttribute('close') || ')';
    const separators = element.getAttribute('separators') || ',';
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
    
    // Process content with separators
    const openFence = mapFence(open);
    const closeFence = mapFence(close);
    
    // If this looks like a set notation
    if (open === '{' && close === '}') {
      // Check if there's a vertical bar in the content
      if (content.includes('|')) {
        const parts = content.split('|');
        if (parts.length === 2) {
          return `\\left\\{ ${parts[0]} \\; \\middle| \\; ${parts[1]} \\right\\}`;
        }
      }
    }
    
    return `${openFence}${content}${closeFence}`;
  }
  
  /**
   * Process a table/matrix
   */
  private processTable(element: Element): string {
    // Get all rows
    const rows = Array.from(element.childNodes)
      .filter(n => n.nodeType === 1 && ['mtr', 'mlabeledtr'].includes((n as Element).tagName.toLowerCase()));
    
    // Look for matrix attributes to determine the type
    const hasFrame = element.getAttribute('frame') === 'solid';
    const hasLines = element.getAttribute('rowlines') !== 'none' || element.getAttribute('columnlines') !== 'none';
    
    // Determine matrix type
    let matrixType = 'pmatrix'; // Default: parentheses
    
    if (hasFrame) {
      matrixType = 'Bmatrix'; // Curly braces
    } else {
      // Check for fence attributes from parent
      const parent = element.parentElement;
      if (parent && parent.tagName.toLowerCase() === 'mfenced') {
        const open = parent.getAttribute('open');
        const close = parent.getAttribute('close');
        
        if (open === '[' && close === ']') {
          matrixType = 'bmatrix'; // Square brackets
        } else if (open === '{' && close === '}') {
          matrixType = 'Bmatrix'; // Curly braces
        } else if (open === '|' && close === '|') {
          matrixType = 'vmatrix'; // Vertical bars
        } else if (open === '‖' && close === '‖') {
          matrixType = 'Vmatrix'; // Double vertical bars
        }
      }
    }
    
    // For tables with borders, use array environment instead
    if (hasLines || rows.length >= 10 || (rows.length > 0 && rows[0].childNodes.length >= 10)) {
      return this.processTableAsArray(element, rows);
    }
    
    // Process each row
    const processedRows = rows.map(row => this.processTableRow(row as Element));
    
    // Create a matrix
    return `\\begin{${matrixType}}${processedRows.join(' \\\\ ')}\\end{${matrixType}}`;
  }
  
  /**
   * Process a table row
   */
  private processTableRow(row: Element): string {
    // Get all cells in this row
    const cells = Array.from(row.childNodes)
      .filter(n => n.nodeType === 1 && ['mtd', 'mth'].includes((n as Element).tagName.toLowerCase()));
    
    // Process each cell
    return cells.map(cell => this.processMathNode(cell)).join(' & ');
  }
  
  /**
   * Process a table as an array (for tables with borders or large tables)
   */
  private processTableAsArray(table: Element, rows: Node[]): string {
    const columnCount = Math.max(...rows.map(row => 
      Array.from(row.childNodes).filter(n => 
        n.nodeType === 1 && ['mtd', 'mth'].includes((n as Element).tagName.toLowerCase())
      ).length
    ));
    
    // Create column specification
    const columnSpec = 'c'.repeat(columnCount);
    
    // Process rows
    const processedRows = rows.map(row => this.processTableRow(row as Element));
    
    // Create array
    return `\\left(\\begin{array}{${columnSpec}}${processedRows.join(' \\\\ ')}\\end{array}\\right)`;
  }
  
  /**
   * Process over script (like \hat, \bar, etc.)
   */
  private processOverScript(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const over = this.processMathNode(children[1]);
      
      // Check for common accents
      if (over === '¯' || over === '‾') return `\\overline{${base}}`;
      if (over === '^') return `\\hat{${base}}`;
      if (over === '˜' || over === '∼') return `\\tilde{${base}}`;
      if (over === '→') return `\\vec{${base}}`;
      if (over === '˙') return `\\dot{${base}}`;
      if (over === '¨') return `\\ddot{${base}}`;
      if (over === '⃛') return `\\dddot{${base}}`;
      
      // For limits notation (like \sum limits_{i=1}^{n})
      if (this.isLargeOperator(base)) {
        return `${base}\\limits^{${over}}`;
      }
      
      // Generic overscript
      return `\\overset{${over}}{${base}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process under script
   */
  private processUnderScript(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 2) {
      const base = this.processMathNode(children[0]);
      const under = this.processMathNode(children[1]);
      
      // For limits notation (like \sum limits_{i=1}^{n})
      if (this.isLargeOperator(base)) {
        return `${base}\\limits_{${under}}`;
      }
      
      // Generic underscript
      return `\\underset{${under}}{${base}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process under and over scripts
   */
  private processUnderOverScript(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 3) {
      const base = this.processMathNode(children[0]);
      const under = this.processMathNode(children[1]);
      const over = this.processMathNode(children[2]);
      
      // For limits notation (like \sum limits_{i=1}^{n})
      if (this.isLargeOperator(base)) {
        return `${base}\\limits_{${under}}^{${over}}`;
      }
      
      // Generic underoverscript
      return `\\underset{${under}}{\\overset{${over}}{${base}}}`;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Process multi scripts (subscripts, superscripts, pre-subscripts, pre-superscripts)
   */
  private processMultiScripts(element: Element): string {
    const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
    
    if (children.length >= 3) {
      const base = this.processMathNode(children[0]);
      
      // Extract scripts
      let subScript = '';
      let superScript = '';
      let preSubScript = '';
      let preSuperScript = '';
      
      // Process tensor-style indices
      // Pattern is base, sub, super, presub, presuper, ...
      for (let i = 1; i < children.length; i += 2) {
        if (i + 1 < children.length) {
          // We have a pair of scripts
          const sub = this.processMathNode(children[i]);
          const sup = this.processMathNode(children[i + 1]);
          
          if (i === 1) {
            // Normal subscript and superscript
            subScript = sub;
            superScript = sup;
          } else {
            // Pre-scripts
            preSubScript = sub;
            preSuperScript = sup;
          }
        } else {
          // Odd number of scripts, just handle as subscript
          const sub = this.processMathNode(children[i]);
          if (i === 1) {
            subScript = sub;
          } else {
            preSubScript = sub;
          }
        }
      }
      
      // Build the result
      let result = base;
      
      // Add normal scripts
      if (subScript && subScript !== '<none />') {
        result += `_{${subScript}}`;
      }
      
      if (superScript && superScript !== '<none />') {
        result += `^{${superScript}}`;
      }
      
      // Add pre-scripts using \prescript command
      if ((preSubScript && preSubScript !== '<none />') || 
          (preSuperScript && preSuperScript !== '<none />')) {
        // Use {}_{pre-sub}^{pre-sup} base
        const preSubPart = preSubScript ? `_{${preSubScript}}` : '';
        const preSuperPart = preSuperScript ? `^{${preSuperScript}}` : '';
        
        // We need to use \sideset or tensor notation
        result = `{}${preSuperPart}${preSubPart} ${result}`;
      }
      
      return result;
    }
    
    return this.processChildNodes(element);
  }
  
  /**
   * Check if a string is a large operator like \sum, \prod, etc.
   */
  private isLargeOperator(text: string): boolean {
    const largeOperators = ['\\sum', '\\prod', '\\int', '\\oint', '\\bigcup', '\\bigcap', 
                          '\\bigvee', '\\bigwedge', '\\coprod', '\\bigoplus', '\\bigotimes'];
    return largeOperators.some(op => text.trim() === op);
  }
  
  /**
   * Post-process the LaTeX to ensure proper formatting
   */
  private postProcessLatex(latex: string): string {
    // Ensure proper spacing for operators
    let result = latex
      // Handle spacing for binary operators
      .replace(/([0-9a-zA-Z}])([\+\-\*\/=])/g, '$1 $2 ')
      .replace(/([\+\-\*\/=])([0-9a-zA-Z\\{])/g, '$1 $2')
      
      // Fix double backslashes (which can appear due to operator mapping)
      .replace(/\\\\/g, '\\')
      
      // Fix common issues
      .replace(/\s+/g, ' ') // Remove excessive spaces
      .replace(/\s*([,;])/g, '$1 ') // Fix comma spacing
      
      // Fix spaces around delimiters
      .replace(/\s*\{\s*/g, '{')
      .replace(/\s*\}\s*/g, '}')
      
      // Fix spaces in fractions
      .replace(/\\frac\s*\{\s*/g, '\\frac{')
      .replace(/\s*\}\s*\{\s*/g, '}{')
      
      // Remove spaces after math functions
      .replace(/(\\[a-zA-Z]+)\s+/g, '$1')
      
      // Final cleanup
      .trim();
    
    return result;
  }
  
  /**
   * Basic fallback conversion for when parsing fails
   */
  private fallbackMathMLConversion(mathml: string): string {
    this.logger.debug('Using fallback MathML conversion');
    
    // Extract text content from tags
    let textContent = mathml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Process common elements
    const processCommonElements = () => {
      // Process fractions
      const fracPattern = /<mfrac[^>]*>\s*<mrow[^>]*>(.*?)<\/mrow>\s*<mrow[^>]*>(.*?)<\/mrow>\s*<\/mfrac>/gs;
      mathml = mathml.replace(fracPattern, (match, num, den) => {
        const numContent = this.stripTags(num);
        const denContent = this.stripTags(den);
        return `\\frac{${numContent}}{${denContent}}`;
      });
      
      // Process superscripts
      const supPattern = /<msup[^>]*>\s*<mi[^>]*>(.*?)<\/mi>\s*<mn[^>]*>(.*?)<\/mn>\s*<\/msup>/gs;
      mathml = mathml.replace(supPattern, (match, base, exp) => {
        return `${base}^{${exp}}`;
      });
      
      // Process subscripts
      const subPattern = /<msub[^>]*>\s*<mi[^>]*>(.*?)<\/mi>\s*<mn[^>]*>(.*?)<\/mn>\s*<\/msub>/gs;
      mathml = mathml.replace(subPattern, (match, base, sub) => {
        return `${base}_{${sub}}`;
      });
      
      // Process square roots
      const sqrtPattern = /<msqrt[^>]*>(.*?)<\/msqrt>/gs;
      mathml = mathml.replace(sqrtPattern, (match, content) => {
        const innerContent = this.stripTags(content);
        return `\\sqrt{${innerContent}}`;
      });
      
      // Extract the processed content
      textContent = this.stripTags(mathml);
    };
    
    // Try to process common elements
    try {
      processCommonElements();
    } catch (error) {
      this.logger.error(`Error in fallback processing: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Replace common operators
    return textContent
      .replace(/×/g, '\\times ')
      .replace(/⋅/g, '\\cdot ')
      .replace(/÷/g, '\\div ')
      .replace(/√/g, '\\sqrt')
      .replace(/∑/g, '\\sum ')
      .replace(/∫/g, '\\int ')
      .replace(/π/g, '\\pi ')
      .replace(/∞/g, '\\infty ')
      .replace(/≤/g, '\\leq ')
      .replace(/≥/g, '\\geq ')
      .replace(/≠/g, '\\neq ')
      .replace(/≈/g, '\\approx ');
  }
  
  /**
   * Strip HTML/XML tags from a string
   */
  private stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}