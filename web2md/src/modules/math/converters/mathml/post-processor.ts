/**
 * Post-process the LaTeX to ensure proper formatting
 */
export function postProcessLatex(latex: string): string {
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