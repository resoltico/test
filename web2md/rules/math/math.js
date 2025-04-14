/**
 * Math expression handling rule
 */

/**
 * Extracts math content from a node
 */
function extractMathContent(node) {
  // Try to get the content from different attributes commonly used for math
  const mathML = node.getAttribute('data-math-content') || 
                 node.getAttribute('math') || 
                 node.getAttribute('tex');
                 
  if (mathML) {
    return mathML;
  }
  
  // If no attribute has the math content, use the text content
  return node.textContent.trim();
}

/**
 * Determines if math should be displayed in block mode
 */
function isDisplayMath(node) {
  // Check for display mode indicators
  const displayMode = node.getAttribute('display') === 'block' ||
                      node.getAttribute('data-display-mode') === 'true' ||
                      node.getAttribute('mode') === 'display' ||
                      node.classList.contains('display-math') ||
                      node.tagName.toLowerCase() === 'div';
                      
  return displayMode;
}

/**
 * Cleans up the math content for display
 */
function processMathContent(content) {
  // Remove unnecessary escaping and normalize
  return content
    .replace(/\\\\/, '\\') // Reduce double backslashes
    .replace(/\\+\s/g, ' ') // Fix escaped spaces
    .trim();
}

/**
 * Math handling rule definition
 */
export default {
  name: 'math',
  
  filter: (node) => {
    const nodeName = node.nodeName.toLowerCase();
    
    // Match common math element types
    return nodeName === 'math' || 
           (nodeName === 'span' && node.classList.contains('math')) ||
           (nodeName === 'div' && node.classList.contains('math')) ||
           node.hasAttribute('data-math') ||
           node.hasAttribute('data-tex') ||
           node.hasAttribute('tex');
  },
  
  replacement: (content, node) => {
    // Extract math content
    const mathContent = extractMathContent(node);
    
    // Determine if display or inline math
    const isDisplay = isDisplayMath(node);
    
    // Format with appropriate delimiters
    const delimiter = isDisplay ? '$$' : '$';
    return `${delimiter}${processMathContent(mathContent)}${delimiter}${isDisplay ? '\n\n' : ''}`;
  }
};
