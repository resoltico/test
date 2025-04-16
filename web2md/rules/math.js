/**
 * Generic math expression handling rule
 * Works with preprocessed math elements from the math processor
 */
export default {
  name: 'math',
  
  filter: (node) => {
    // Match preprocessed math elements
    const className = node.className ? node.className.toString() : '';
    
    // Check for preprocessed elements first
    if (className === 'math-inline' || className === 'math-block') {
      return true;
    }
    
    // Fallback detection for any elements not caught by preprocessing
    // This uses data attributes rather than hardcoded element types
    const hasDataAttribute = node.hasAttribute && (
      node.hasAttribute('data-math') || 
      node.hasAttribute('data-latex') || 
      node.hasAttribute('data-mathml') || 
      node.hasAttribute('data-asciimath') ||
      node.hasAttribute('data-math-format')
    );
    
    if (hasDataAttribute) {
      return true;
    }
    
    // Check for common math-related elements
    const nodeName = node.nodeName.toLowerCase();
    if (nodeName === 'math') {
      return true;
    }
    
    // Check for script elements with math content
    if (nodeName === 'script' && node.getAttribute) {
      const type = node.getAttribute('type') || '';
      return type.includes('math/');
    }
    
    return false;
  },
  
  replacement: (content, node) => {
    try {
      // Get display mode
      const isBlock = node.className === 'math-block' || 
                      node.getAttribute('data-math-display') === 'block';
      
      // Get math content
      let mathContent = content.trim();
      
      // Skip empty content
      if (!mathContent) {
        return '';
      }
      
      // Get the configured delimiters from attributes if available
      // Otherwise use default $ and $$ delimiters
      const inlineDelimiter = node.getAttribute('data-math-inline-delimiter') || '$';
      const blockDelimiter = node.getAttribute('data-math-block-delimiter') || '$$';
      
      // Format with appropriate delimiters
      const delimiter = isBlock ? blockDelimiter : inlineDelimiter;
      const spacing = isBlock ? '\n\n' : '';
      
      return `${delimiter}${mathContent}${delimiter}${spacing}`;
    } catch (error) {
      console.error('Error processing math:', error);
      
      // Just return the content as fallback
      return content;
    }
  }
};