/**
 * Advanced math expression handling rule
 * Detects and converts various math formatting to LaTeX syntax
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
           node.hasAttribute('data-latex') ||
           (nodeName === 'script' && 
            (node.getAttribute('type') === 'math/tex' || 
             node.getAttribute('type') === 'math/asciimath'));
  },
  
  replacement: (content, node) => {
    // Extract math content from various attributes
    const mathContent = 
      node.getAttribute('data-math-content') || 
      node.getAttribute('data-latex') ||
      node.getAttribute('data-math') ||
      node.textContent.trim();
    
    // Skip empty content
    if (!mathContent) {
      return '';
    }
    
    // Determine if display or inline math
    const isDisplay = 
      node.getAttribute('display') === 'block' ||
      node.classList.contains('display-math') ||
      node.nodeName.toLowerCase() === 'div' ||
      node.getAttribute('type') === 'math/tex; mode=display';
    
    // Format with appropriate delimiters
    const delimiter = isDisplay ? '$$' : '$';
    return `${delimiter}${mathContent}${delimiter}${isDisplay ? '\n\n' : ''}`;
  }
};
