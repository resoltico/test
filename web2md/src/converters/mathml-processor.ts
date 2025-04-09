import { JSDOM } from 'jsdom';

/**
 * Simple MathML to LaTeX converter
 * @param mathml MathML string to convert
 * @returns LaTeX string
 */
function mathmlToLatex(mathml: string): string {
  try {
    // Try extracting simple equations directly when possible
    // This avoids the need for external libraries in simple cases
    if (mathml.includes('<math') && mathml.includes('</math>')) {
      // Extract operators and variables
      const mi = mathml.match(/<mi>(.*?)<\/mi>/g) || [];
      const mo = mathml.match(/<mo>(.*?)<\/mo>/g) || [];
      const mn = mathml.match(/<mn>(.*?)<\/mn>/g) || [];
      
      if (mi.length > 0 || mo.length > 0 || mn.length > 0) {
        const variables = mi.map(x => x.replace(/<mi>(.*?)<\/mi>/, '$1'));
        const operators = mo.map(x => x.replace(/<mo>(.*?)<\/mo>/, '$1'));
        const numbers = mn.map(x => x.replace(/<mn>(.*?)<\/mn>/, '$1'));
        
        // Combine all elements in order they might appear in the original
        // This is a very simplified approach
        const combined = [...variables, ...operators, ...numbers].join(' ');
        
        if (combined) {
          return combined;
        }
      }
    }
    
    // If we can't extract basic components, use the fallback converter
    return fallbackConverter(mathml);
  } catch (error) {
    console.error('Error converting MathML to LaTeX:', error);
    return 'math conversion error';
  }
}

/**
 * Fallback MathML to LaTeX converter
 * @param mathml MathML string to convert
 * @returns LaTeX string
 */
function fallbackConverter(mathml: string): string {
  console.warn('Using fallback MathML to LaTeX converter');
  
  // Extract text content from MathML
  const textContent = mathml.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!textContent) {
    return 'math';
  }
  
  // Very basic MathML handling
  if (mathml.includes('<mfrac>')) {
    // Try to extract fraction components
    const match = mathml.match(/<mfrac[^>]*>(.*?)<\/mfrac>/s);
    if (match) {
      const parts = match[1].split(/<\/[^>]+>/);
      const num = parts[0].replace(/<[^>]+>/g, '').trim();
      const den = parts[1].replace(/<[^>]+>/g, '').trim();
      if (num && den) {
        return `\\frac{${num}}{${den}}`;
      }
    }
  }
  
  return textContent;
}

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
      // Convert MathML to LaTeX
      const mathML = mathElement.outerHTML;
      let latex = mathmlToLatex(mathML);
      
      // Clean up the LaTeX (remove unnecessary whitespace, etc.)
      latex = cleanLatex(latex);
      
      // Check if the math element is inline or block
      const isInline = isInlineMath(mathElement);
      
      // Format LaTeX for Markdown
      const markdownMath = formatLatexForMarkdown(latex, isInline);
      
      // Create a replacement element
      const replacementElement = document.createElement('span');
      replacementElement.classList.add('markdown-math');
      replacementElement.textContent = markdownMath;
      
      // Replace the MathML element with the Markdown-formatted LaTeX
      mathElement.parentNode?.replaceChild(replacementElement, mathElement);
    } catch (error) {
      console.error('Error processing individual MathML element:', error);
      
      // If conversion fails, try a simplified approach
      try {
        // Extract a basic representation of the math expression
        const mathContent = simplifyMathML(mathElement);
        
        // Format for Markdown
        const isInline = isInlineMath(mathElement);
        const markdownMath = formatLatexForMarkdown(mathContent, isInline);
        
        // Create a replacement element
        const replacementElement = document.createElement('span');
        replacementElement.classList.add('markdown-math');
        replacementElement.textContent = markdownMath;
        
        // Replace the MathML element
        mathElement.parentNode?.replaceChild(replacementElement, mathElement);
      } catch (fallbackError) {
        console.error('Fallback MathML processing failed:', fallbackError);
        // Keep the original element if fallback fails
      }
    }
  }
  
  return dom.serialize();
}

/**
 * Extracts a simplified representation of MathML content
 * @param mathElement The MathML element
 * @returns A simplified string representation
 */
function simplifyMathML(mathElement: Element): string {
  // This is a very simplified approach that won't handle complex cases
  try {
    // Get the text content of the element
    const textContent = mathElement.textContent || '';
    
    // For empty elements, return a placeholder
    if (!textContent.trim()) {
      return 'math expression';
    }
    
    // Extract identifiers, operators, and numbers
    const identifiers = Array.from(mathElement.querySelectorAll('mi')).map(el => el.textContent || '');
    const operators = Array.from(mathElement.querySelectorAll('mo')).map(el => el.textContent || '');
    const numbers = Array.from(mathElement.querySelectorAll('mn')).map(el => el.textContent || '');
    
    // If we extracted structured elements, try to format them
    if (identifiers.length > 0 || operators.length > 0 || numbers.length > 0) {
      // Handle fractions
      if (mathElement.querySelector('mfrac')) {
        const numerator = mathElement.querySelector('mfrac > :first-child')?.textContent || '';
        const denominator = mathElement.querySelector('mfrac > :nth-child(2)')?.textContent || '';
        if (numerator && denominator) {
          return `\\frac{${numerator}}{${denominator}}`;
        }
      }
      
      // Handle square roots
      if (mathElement.querySelector('msqrt')) {
        const content = mathElement.querySelector('msqrt')?.textContent || '';
        if (content) {
          return `\\sqrt{${content}}`;
        }
      }
      
      // Handle simple expressions by joining elements
      const elements = [...identifiers, ...operators, ...numbers];
      if (elements.length > 0) {
        return elements.join(' ');
      }
    }
    
    // Fall back to text content
    return textContent;
  } catch (error) {
    console.error('Error in simplifyMathML:', error);
    return 'math expression';
  }
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
  
  // If no display attribute, check the parent element
  const parent = mathElement.parentElement;
  if (!parent) return true; // Default to inline if no parent
  
  // Check if the parent is a block element
  const blockElements = [
    'div', 'p', 'section', 'article', 'main', 'figure', 'blockquote'
  ];
  
  if (blockElements.includes(parent.tagName.toLowerCase())) {
    // If parent is a block element and the math is the only child, treat as block
    return parent.childNodes.length > 1;
  }
  
  // Default to inline
  return true;
}

/**
 * Formats LaTeX for Markdown
 * @param latex The LaTeX string
 * @param isInline Whether the math should be displayed inline
 * @returns Markdown-formatted LaTeX
 */
function formatLatexForMarkdown(latex: string, isInline: boolean): string {
  if (isInline) {
    return `$${latex}$`;
  } else {
    return `\n\n$$${latex}$$\n\n`;
  }
}

/**
 * Cleans up LaTeX by removing unnecessary whitespace, etc.
 * @param latex The LaTeX string to clean
 * @returns The cleaned LaTeX string
 */
function cleanLatex(latex: string): string {
  // Remove excessive whitespace
  let cleaned = latex.replace(/\s+/g, ' ').trim();
  
  // Fix common issues with mathml-to-latex conversion
  cleaned = cleaned
    // Fix for fractions
    .replace(/\\frac\s+{([^}]+)}\s+{([^}]+)}/g, '\\frac{$1}{$2}')
    // Fix for square roots
    .replace(/\\sqrt\s+{([^}]+)}/g, '\\sqrt{$1}')
    // Fix for subscripts
    .replace(/([a-zA-Z0-9])_\s+{([^}]+)}/g, '$1_{$2}')
    // Fix for superscripts
    .replace(/([a-zA-Z0-9])\^\s+{([^}]+)}/g, '$1^{$2}');
  
  return cleaned;
}
