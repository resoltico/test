/**
 * Math expressions rule
 */
export default {
  name: 'math',
  
  filter: (node) => {
    const nodeName = node.nodeName.toLowerCase();
    
    // Match common math element types
    return nodeName === 'math' || 
           (nodeName === 'span' && node.classList.contains('math')) ||
           (nodeName === 'div' && node.classList.contains('math')) ||
           node.hasAttribute('data-math');
  },
  
  replacement: (content, node) => {
    // Extract math content from various attributes
    const mathContent = 
      node.getAttribute('data-math-content') || 
      node.getAttribute('tex') ||
      node.textContent.trim();
    
    // Determine if display or inline math
    const isDisplay = 
      node.getAttribute('display') === 'block' ||
      node.classList.contains('display-math') ||
      node.nodeName.toLowerCase() === 'div';
    
    // Format with appropriate delimiters
    const delimiter = isDisplay ? '$$' : '$';
    return `${delimiter}${mathContent}${delimiter}${isDisplay ? '\n\n' : ''}`;
  }
};