/**
 * Enhanced math rule to preserve placeholders in Turndown
 * This is critical to ensure our math content survives the conversion process
 */
export default {
  name: 'math',
  
  // Filter to match both our special wrapper spans and any node containing our placeholder pattern
  filter: (node) => {
    // Check if this is our special math placeholder wrapper
    if (node.nodeName === 'SPAN' && 
        node.className === 'math-placeholder-wrapper' &&
        node.getAttribute('data-math-placeholder') === 'true') {
      return true;
    }
    
    // Check for text nodes that contain our placeholder pattern
    if (node.nodeType === 3 && // Text node
        node.nodeValue && 
        node.nodeValue.includes('%%MATH_PLACEHOLDER_')) {
      return true;
    }
    
    // If the node has a text child that contains our pattern
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 3 && // Text node
            child.nodeValue && 
            child.nodeValue.includes('%%MATH_PLACEHOLDER_')) {
          return true;
        }
      }
    }
    
    return false;
  },
  
  // This is the critical part - we preserve the placeholder text exactly as-is
  replacement: (content, node) => {
    // If this is our wrapper span, return its text content directly
    if (node.nodeName === 'SPAN' && 
        node.className === 'math-placeholder-wrapper' &&
        node.getAttribute('data-math-placeholder') === 'true') {
      return node.textContent || '';
    }
    
    // If this is a text node with a placeholder, return it as-is
    if (node.nodeType === 3 && 
        node.nodeValue && 
        node.nodeValue.includes('%%MATH_PLACEHOLDER_')) {
      return node.nodeValue;
    }
    
    // If the node contains a placeholder in its children, we need special handling
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 3 && 
            child.nodeValue && 
            child.nodeValue.includes('%%MATH_PLACEHOLDER_')) {
          
          // Extract the placeholder pattern
          const match = child.nodeValue.match(/%%MATH_PLACEHOLDER_\d+%%/);
          if (match) {
            // Return the placeholder directly, bypassing any Turndown processing
            return match[0];
          }
        }
      }
    }
    
    // If we somehow got here but still have placeholder text in the content
    const match = content.match(/%%MATH_PLACEHOLDER_\d+%%/);
    if (match) {
      return match[0];
    }
    
    // Fallback: just return the content (this shouldn't happen with our filter)
    return content;
  }
};