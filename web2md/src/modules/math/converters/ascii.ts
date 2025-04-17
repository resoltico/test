import { MathConverter } from './base.js';
import { ConversionContext } from '../../../types/modules/math.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Converter for ASCII math format
 */
export class ASCIIMathConverter extends MathConverter {
  // Mapping of ASCIIMath symbols to LaTeX
  private readonly symbolMap: Record<string, string> = {
    // Greek letters
    'alpha': '\\alpha',
    'beta': '\\beta',
    'gamma': '\\gamma',
    'Gamma': '\\Gamma',
    'delta': '\\delta',
    'Delta': '\\Delta',
    'epsilon': '\\epsilon',
    'varepsilon': '\\varepsilon',
    'zeta': '\\zeta',
    'eta': '\\eta',
    'theta': '\\theta',
    'Theta': '\\Theta',
    'iota': '\\iota',
    'kappa': '\\kappa',
    'lambda': '\\lambda',
    'Lambda': '\\Lambda',
    'mu': '\\mu',
    'nu': '\\nu',
    'xi': '\\xi',
    'Xi': '\\Xi',
    'pi': '\\pi',
    'Pi': '\\Pi',
    'rho': '\\rho',
    'sigma': '\\sigma',
    'Sigma': '\\Sigma',
    'tau': '\\tau',
    'upsilon': '\\upsilon',
    'Upsilon': '\\Upsilon',
    'phi': '\\phi',
    'Phi': '\\Phi',
    'chi': '\\chi',
    'psi': '\\psi',
    'Psi': '\\Psi',
    'omega': '\\omega',
    'Omega': '\\Omega',
    
    // Operators
    '+-': '\\pm',
    'plus-minus': '\\pm',
    '-+': '\\mp',
    'minus-plus': '\\mp',
    'times': '\\times',
    'div': '\\div',
    '/': '\\div',
    'sqrt': '\\sqrt',
    'root': '\\sqrt',
    '^': '\\hat',
    '**': '\\cdot',
    'cdot': '\\cdot',
    'o+': '\\oplus',
    'ox': '\\otimes',
    'sum': '\\sum',
    'prod': '\\prod',
    'lim': '\\lim',
    
    // Relations
    '!=': '\\neq',
    'ne': '\\neq',
    '<=': '\\leq',
    'le': '\\leq',
    '>=': '\\geq',
    'ge': '\\geq',
    'lt': '<',
    'gt': '>',
    'subset': '\\subset',
    'supset': '\\supset',
    'in': '\\in',
    'notin': '\\notin',
    
    // Miscellaneous
    'infinity': '\\infty',
    'oo': '\\infty',
    'partial': '\\partial',
    'grad': '\\nabla',
    'del': '\\nabla',
    'space': '\\;',
    
    // Functions
    'sin': '\\sin',
    'cos': '\\cos',
    'tan': '\\tan',
    'cot': '\\cot',
    'sec': '\\sec',
    'csc': '\\csc',
    'log': '\\log',
    'ln': '\\ln',
    'exp': '\\exp',
    'arcsin': '\\arcsin',
    'arccos': '\\arccos',
    'arctan': '\\arctan'
  };
  
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert ASCII math to LaTeX
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting ASCIIMath to LaTeX`);
      
      // Clean the input content
      const cleanedContent = this.cleanContent(content);
      
      // If the content already looks like LaTeX (has backslashes), assume it is
      if (cleanedContent.includes('\\')) {
        this.logger.debug('Content appears to already be LaTeX, skipping conversion');
        return cleanedContent;
      }
      
      // Convert ASCIIMath to LaTeX
      const latex = this.convertASCIIToLaTeX(cleanedContent);
      
      // Process special Markdown-sensitive characters
      const shouldProtect = this.getContextValue(context, 'protectLatex', true);
      const processedLatex = this.processLatexSpecialChars(latex, shouldProtect);
      
      this.logger.debug(`Successfully converted ASCIIMath to LaTeX`);
      return processedLatex;
    } catch (error) {
      this.logger.error(`Error converting ASCIIMath: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return the original content on error
      return this.cleanContent(content);
    }
  }
  
  /**
   * Convert ASCII math to LaTeX
   * This is a simplified implementation that handles common ASCIIMath patterns
   */
  private convertASCIIToLaTeX(ascii: string): string {
    let content = ascii;
    
    // Replace symbols and operators based on the mapping
    Object.entries(this.symbolMap).forEach(([asciiSymbol, latexSymbol]) => {
      // Create a regex that finds the symbol surrounded by whitespace or at start/end of string
      const regex = new RegExp(`(^|\\s)${asciiSymbol}($|\\s)`, 'g');
      content = content.replace(regex, `$1${latexSymbol}$2`);
    });
    
    // Replace the most common ASCIIMath syntax patterns
    
    // Fractions (numerator/denominator)
    content = content.replace(/\{([^{}]+)\}\/\{([^{}]+)\}/g, '\\frac{$1}{$2}');
    
    // Simple fractions with single terms (a/b)
    content = content.replace(/([a-zA-Z0-9])\/([a-zA-Z0-9])/g, '\\frac{$1}{$2}');
    
    // Superscripts with single character (x^2)
    content = content.replace(/([a-zA-Z0-9])(\^)([a-zA-Z0-9])/g, '$1^{$3}');
    
    // Superscripts with braces (x^{a+b})
    content = content.replace(/([a-zA-Z0-9])(\^)\{([^{}]+)\}/g, '$1^{$3}');
    
    // Subscripts with single character (x_n)
    content = content.replace(/([a-zA-Z0-9])(_)([a-zA-Z0-9])/g, '$1_{$3}');
    
    // Subscripts with braces (x_{i+j})
    content = content.replace(/([a-zA-Z0-9])(_)\{([^{}]+)\}/g, '$1_{$3}');
    
    // Square roots (sqrt(x))
    content = content.replace(/sqrt\(([^()]+)\)/g, '\\sqrt{$1}');
    
    // nth roots (root(n)(x))
    content = content.replace(/root\(([^()]+)\)\(([^()]+)\)/g, '\\sqrt[$1]{$2}');
    
    // Text in quotes
    content = content.replace(/"([^"]+)"/g, '\\text{$1}');
    
    // Matrices
    content = content.replace(/\[\[([^\[\]]+)\]\]/g, '\\begin{bmatrix}$1\\end{bmatrix}');
    
    // Matrix rows
    content = content.replace(/\],\[/g, '\\\\');
    content = content.replace(/,/g, '&');
    
    // Fix spacing around operators
    content = content
      .replace(/([0-9a-zA-Z}])([+\-=<>])/g, '$1 $2 ')
      .replace(/([+\-=<>])([0-9a-zA-Z\\{])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    
    return content;
  }
}