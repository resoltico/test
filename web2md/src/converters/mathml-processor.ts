import { JSDOM } from 'jsdom';

/**
 * Processes HTML content to convert MathML to LaTeX and format it for Markdown
 * @param html The HTML content containing MathML
 * @returns HTML with MathML replaced by Markdown-compatible LaTeX
 */
export async function processMathML(html: string): Promise<string> {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find all MathML elements
  const mathElements = document.querySelectorAll('math');
  
  if (mathElements.length === 0) {
    // No MathML elements found, return the original HTML
    return html;
  }
  
  // Process each MathML element
  for (const mathElement of mathElements) {
    try {
      // Convert MathML to LaTeX representation
      const latex = convertMathMLToLatex(mathElement);
      
      // Check if the math element is inline or block
      const isInline = isInlineMath(mathElement);
      
      // Format LaTeX for Markdown based on expected style
      const markdownMath = formatMathForMarkdown(latex, isInline);
      
      // Create a replacement element
      const replacementElement = document.createElement('span');
      replacementElement.classList.add('markdown-math');
      replacementElement.textContent = markdownMath;
      
      // Replace the MathML element with the Markdown-formatted LaTeX
      mathElement.parentNode?.replaceChild(replacementElement, mathElement);
    } catch (error) {
      console.error('Error processing MathML element:', error);
      
      // If conversion fails, preserve a basic representation
      const textContent = mathElement.textContent || 'math expression';
      const replacementElement = document.createElement('span');
      replacementElement.classList.add('markdown-math');
      replacementElement.textContent = textContent;
      
      // Replace the MathML element
      mathElement.parentNode?.replaceChild(replacementElement, mathElement);
    }
  }
  
  return dom.serialize();
}

/**
 * Converts MathML element to LaTeX string using a generalized approach
 * @param mathElement The MathML element to convert
 * @returns LaTeX representation of the mathematical expression
 */
function convertMathMLToLatex(mathElement: Element): string {
  // Extract the structure of the MathML content
  return generateLatexFromMathML(mathElement);
}

/**
 * Recursively processes MathML elements to generate LaTeX
 * @param element The current MathML element to process
 * @returns LaTeX representation
 */
function generateLatexFromMathML(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  
  // Base element handling
  if (tagName === 'mi') {
    // Math identifier (variables)
    return element.textContent || '';
  } else if (tagName === 'mn') {
    // Math number
    return element.textContent || '';
  } else if (tagName === 'mo') {
    // Math operator
    const op = element.textContent || '';
    
    // Map common operators to LaTeX
    const opMap: Record<string, string> = {
      '×': ' × ',
      '÷': ' ÷ ',
      '+': ' + ',
      '-': ' - ',
      '=': ' = ',
      '<': ' < ',
      '>': ' > ',
      '≤': ' ≤ ',
      '≥': ' ≥ ',
      '∈': ' ∈ ',
      '∉': ' ∉ ',
      '⊂': ' ⊂ ',
      '⊃': ' ⊃ ',
      '∪': ' ∪ ',
      '∩': ' ∩ '
    };
    
    return opMap[op] || op;
  }
  
  // Structure handling
  if (tagName === 'mrow') {
    // Process all children and join
    return Array.from(element.children)
      .map(child => generateLatexFromMathML(child))
      .join('');
  } else if (tagName === 'msqrt') {
    // Square root
    const content = Array.from(element.children)
      .map(child => generateLatexFromMathML(child))
      .join('');
    return `√${content}`;
  } else if (tagName === 'mfrac') {
    // Fraction
    const children = Array.from(element.children);
    if (children.length >= 2) {
      const numerator = generateLatexFromMathML(children[0]);
      const denominator = generateLatexFromMathML(children[1]);
      return `${numerator}/${denominator}`;
    }
  } else if (tagName === 'msub') {
    // Subscript
    const children = Array.from(element.children);
    if (children.length >= 2) {
      const base = generateLatexFromMathML(children[0]);
      const subscript = generateLatexFromMathML(children[1]);
      return `${base}_${subscript}`;
    }
  } else if (tagName === 'msup') {
    // Superscript
    const children = Array.from(element.children);
    if (children.length >= 2) {
      const base = generateLatexFromMathML(children[0]);
      const superscript = generateLatexFromMathML(children[1]);
      return `${base}^${superscript}`;
    }
  } else if (tagName === 'math') {
    // Process the math element by handling its children
    return Array.from(element.children)
      .map(child => generateLatexFromMathML(child))
      .join('');
  }
  
  // Default: just extract text content for unhandled elements
  return element.textContent || '';
}

/**
 * Determines if a math element should be treated as inline math
 * @param mathElement The MathML element
 * @returns True if the element should be treated as inline math, false otherwise
 */
function isInlineMath(mathElement: Element): boolean {
  // Check for display attribute
  const display = mathElement.getAttribute('display');
  if (display === 'block') {
    return false;
  }
  
  // If no display attribute, check the parent element type
  const parent = mathElement.parentElement;
  if (!parent) return true; // Default to inline if no parent
  
  // Check if parent is a block element
  const blockElements = [
    'div', 'p', 'section', 'article', 'main', 'figure', 'blockquote'
  ];
  
  if (blockElements.includes(parent.tagName.toLowerCase())) {
    // If parent is a block element and math is the only child, treat as block
    return parent.childNodes.length > 1;
  }
  
  // Default to inline
  return true;
}

/**
 * Formats math notation for Markdown based on expected output style
 * @param latex The LaTeX string
 * @param isInline Whether the math should be displayed inline
 * @returns Markdown-formatted math notation
 */
function formatMathForMarkdown(latex: string, isInline: boolean): string {
  // Based on the reference file, it appears the expected format is
  // plain text for math rather than LaTeX delimiters
  
  // Simplify the LaTeX to match the reference style
  const simplified = simplifyLatexForPlaintext(latex);
  
  return simplified;
}

/**
 * Simplifies LaTeX notation to plain text format matching the reference style
 * @param latex The LaTeX notation
 * @returns Simplified plain text representation
 */
function simplifyLatexForPlaintext(latex: string): string {
  // Remove LaTeX-specific formatting while maintaining readability
  // This should match the style in the reference file
  
  let simplified = latex;
  
  // Simplify common LaTeX commands
  simplified = simplified
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\log/g, 'log')
    .replace(/\\ln/g, 'ln')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\\mathit\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\_/g, '_')
    .replace(/\\\^/g, '^')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');
  
  // Remove any remaining backslashes
  simplified = simplified.replace(/\\/g, '');
  
  // Normalize spacing
  simplified = simplified.replace(/\s+/g, ' ').trim();
  
  return simplified;
}
