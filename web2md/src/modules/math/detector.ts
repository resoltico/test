import { Logger } from '../../shared/logger/console.js';

/**
 * Detects the math format based on element attributes and content
 */
export class MathFormatDetector {
  constructor(private logger: Logger) {}
  
  /**
   * Detect the math format from an element's attributes and content
   * @param element The element to analyze
   * @returns The detected format or null if not detected
   */
  detectFormat(element: Element): string | null {
    // First, check for explicit format indicators
    const explicitFormat = this.detectExplicitFormat(element);
    if (explicitFormat) {
      return explicitFormat;
    }
    
    // Check element type
    const formatFromElementType = this.detectFormatFromElementType(element);
    if (formatFromElementType) {
      return formatFromElementType;
    }
    
    // Analyze content for format clues
    const formatFromContent = this.detectFormatFromContent(element);
    if (formatFromContent) {
      return formatFromContent;
    }
    
    // No format detected
    return null;
  }
  
  /**
   * Detect format from explicit indicators like data attributes
   */
  private detectExplicitFormat(element: Element): string | null {
    // Check data-format attribute
    if (element.hasAttribute('data-format')) {
      const format = element.getAttribute('data-format');
      if (format && this.isValidFormat(format)) {
        return format.toLowerCase();
      }
    }
    
    // Check data-math-format attribute
    if (element.hasAttribute('data-math-format')) {
      const format = element.getAttribute('data-math-format');
      if (format && this.isValidFormat(format)) {
        return format.toLowerCase();
      }
    }
    
    // Check for format-specific data attributes
    if (element.hasAttribute('data-latex') || element.hasAttribute('data-tex')) {
      return 'latex';
    }
    
    if (element.hasAttribute('data-mathml')) {
      return 'mathml';
    }
    
    if (element.hasAttribute('data-asciimath')) {
      return 'ascii';
    }
    
    // Check for format-specific attributes
    if (element.hasAttribute('latex') || element.hasAttribute('tex')) {
      return 'latex';
    }
    
    if (element.hasAttribute('mathml')) {
      return 'mathml';
    }
    
    if (element.hasAttribute('asciimath')) {
      return 'ascii';
    }
    
    // Check for format-specific classes
    const classList = Array.from(element.classList);
    
    if (classList.some(cls => ['latex', 'tex', 'katex', 'mathjax'].includes(cls.toLowerCase()))) {
      return 'latex';
    }
    
    if (classList.some(cls => ['mathml'].includes(cls.toLowerCase()))) {
      return 'mathml';
    }
    
    if (classList.some(cls => ['asciimath', 'ascii-math'].includes(cls.toLowerCase()))) {
      return 'ascii';
    }
    
    return null;
  }
  
  /**
   * Detect format from element type
   */
  private detectFormatFromElementType(element: Element): string | null {
    const nodeName = element.nodeName.toLowerCase();
    
    // MathML elements
    if (nodeName === 'math') {
      return 'mathml';
    }
    
    // Script elements with type attribute
    if (nodeName === 'script') {
      const type = (element.getAttribute('type') || '').toLowerCase();
      
      if (type.includes('math/tex') || type.includes('latex') || type.includes('mathjax')) {
        return 'latex';
      }
      
      if (type.includes('math/asciimath') || type.includes('ascii')) {
        return 'ascii';
      }
      
      if (type.includes('math/mathml')) {
        return 'mathml';
      }
      
      // Special case for KaTeX
      if (type.includes('math') && element.parentElement?.classList.contains('katex')) {
        return 'latex';
      }
    }
    
    // KaTeX elements
    if (nodeName === 'span' && element.classList.contains('katex')) {
      return 'latex';
    }
    
    // MathJax elements
    if (nodeName === 'span' && (
      element.classList.contains('MathJax') || 
      element.hasAttribute('data-mathml')
    )) {
      // MathJax uses MathML internally but typically displays LaTeX
      return 'latex';
    }
    
    return null;
  }
  
  /**
   * Detect format by analyzing the content
   */
  private detectFormatFromContent(element: Element): string | null {
    const content = element.textContent || '';
    
    // Check for MathML
    if (content.includes('<math') && content.includes('</math>')) {
      return 'mathml';
    }
    
    // Check for LaTeX markers - more comprehensive pattern detection
    const latexPatterns = [
      // LaTeX environments
      /\\begin\{([^}]+)\}/, /\\end\{([^}]+)\}/,
      
      // Common LaTeX commands
      /\\(frac|sum|int|prod|lim|inf|sup|min|max|log|sin|cos|tan)/,
      
      // Greek letters
      /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/i,
      
      // Math delimiters
      /\$\$.+?\$\$/, /\$.+?\$/,
      
      // Other common LaTeX markers
      /\\(left|right|text|mathbb|mathcal|mathrm|mathbf|mathit)/
    ];
    
    if (latexPatterns.some(pattern => pattern.test(content))) {
      return 'latex';
    }
    
    // Check for ASCIIMath patterns
    const asciiMathPatterns = [
      // Common ASCIIMath functions without backslash
      /\b(sin|cos|tan|log|ln)\([^)]+\)/,
      
      // ASCIIMath style fractions
      /\{[^}]+\}\/{[^}]+\}/,
      
      // ASCIIMath style roots
      /root\([^)]+\)\(([^)]+)\)/,
      
      // ASCIIMath style sub/superscripts without braces
      /[a-zA-Z](\^|\_)[a-zA-Z0-9]/
    ];
    
    if (asciiMathPatterns.some(pattern => pattern.test(content)) &&
        !content.includes('\\')) {  // Ensure it's not LaTeX
      return 'ascii';
    }
    
    return null;
  }
  
  /**
   * Check if a format string is valid
   */
  private isValidFormat(format: string): boolean {
    const validFormats = ['latex', 'tex', 'mathml', 'ascii', 'asciimath'];
    return validFormats.includes(format.toLowerCase());
  }
}