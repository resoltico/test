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
    
    // If it contains a math element, it's MathML
    if (element.querySelector('math')) {
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
    
    // Skip checking content for certain element types that typically
    // won't contain math directly
    const skipElementTypes = ['div', 'section', 'article', 'aside', 'nav', 'header', 'footer'];
    if (skipElementTypes.includes(element.nodeName.toLowerCase()) && !this.hasLikelyMathClasses(element)) {
      return null;
    }
    
    // Skip elements with lots of text - likely not math
    if (content.length > 200 && !this.hasHighMathDensity(content)) {
      return null;
    }
    
    // Check for MathML tags
    if (content.includes('<math') && content.includes('</math>')) {
      return 'mathml';
    }
    
    if (content.includes('<mrow') || content.includes('<mi') || 
        content.includes('<mo') || content.includes('<msub')) {
      return 'mathml';
    }
    
    // Check for LaTeX markers - comprehensive pattern detection
    const latexPatterns = [
      // LaTeX environments
      /\\begin\{([^}]+)\}/, /\\end\{([^}]+)\}/,
      
      // Common LaTeX commands
      /\\(frac|sum|int|prod|lim|inf|sup|min|max|log|sin|cos|tan)/,
      
      // Greek letters
      /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/i,
      
      // Math delimiters - modified to avoid false positives
      /\$\$.+?\$\$/,
      
      // Other common LaTeX markers
      /\\(left|right|text|mathbb|mathcal|mathrm|mathbf|mathit)/
    ];

    // Check for math inside dollar signs (being more cautious)
    // Only count this as math if it contains mathematical notation
    const dollarFormulaRegex = /\$([^$\n]+?)\$/;
    const match = dollarFormulaRegex.exec(content);
    if (match && this.containsMathNotation(match[1])) {
      return 'latex';
    }
    
    // Check for other LaTeX patterns
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
    
    // If it has a significant amount of math symbols and no explicit format indicators,
    // be cautious - only return a format if it really looks like math
    const mathSymbols = /[+\-*\/=^_{}[\]()]/g;
    const mathSymbolCount = (content.match(mathSymbols) || []).length;
    
    if (mathSymbolCount > 5 && this.containsMathNotation(content) && content.length < 100) {
      return 'latex';
    }
    
    return null;
  }
  
  /**
   * Check if content contains actual mathematical notation, not just symbols
   */
  private containsMathNotation(content: string): boolean {
    // Look for patterns that are distinctly mathematical
    const mathPatterns = [
      // Mathematical operations with variables
      /[a-zA-Z][+\-*\/=<>][a-zA-Z]/,
      
      // Fractions, exponents, subscripts
      /[a-zA-Z0-9](\^|\/)[\{a-zA-Z0-9]/,
      
      // Common math functions
      /\b(sin|cos|tan|log|ln|lim|max|min|sup|inf)\b/,
      
      // Greek letters (common in math)
      /\b(alpha|beta|gamma|delta|theta|lambda|sigma|omega)\b/i,
      
      // Common mathematical symbols in context
      /[\u2200\u2203\u2208\u2209\u2227\u2228\u2264\u2265\u221E]/u  // ∀, ∃, ∈, ∉, ∧, ∨, ≤, ≥, ∞
    ];
    
    return mathPatterns.some(pattern => pattern.test(content));
  }
  
  /**
   * Check if an element has classes suggesting it might contain math
   */
  private hasLikelyMathClasses(element: Element): boolean {
    const mathClasses = [
      'math', 'formula', 'equation', 'expression', 'mathematics',
      'latex', 'tex', 'katex', 'mathjax', 'mathml'
    ];
    
    return Array.from(element.classList).some(cls => 
      mathClasses.some(mathClass => cls.toLowerCase().includes(mathClass))
    );
  }
  
  /**
   * Check if content has a high density of mathematical notation
   */
  private hasHighMathDensity(content: string): boolean {
    // Count math-specific symbols
    const mathSymbols = /[+\-*\/=^_{}[\]()\\]/g;
    const mathSymbolCount = (content.match(mathSymbols) || []).length;
    
    // Check for specific math patterns
    const hasLatex = /\\[a-zA-Z]+\{/.test(content);
    const hasGreekLetters = /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta)/.test(content);
    const hasMathML = /<m(?:row|i|o|n|sup|sub|frac)/.test(content);
    
    // Calculate density
    const density = mathSymbolCount / content.length;
    
    // High density or specific math notation
    return (density > 0.1) || hasLatex || hasGreekLetters || hasMathML;
  }
  
  /**
   * Check if a format string is valid
   */
  private isValidFormat(format: string): boolean {
    const validFormats = ['latex', 'tex', 'mathml', 'mml', 'ascii', 'asciimath'];
    return validFormats.includes(format.toLowerCase());
  }
}