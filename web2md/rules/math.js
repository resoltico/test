/**
 * Enhanced math expression handling rule
 * Works with any element processed by the math processor
 * and handles both block and inline modes with proper spacing
 */
export default {
  name: 'math',
  
  filter: (node) => {
    // Enhanced pattern matching for math elements
    
    // 1. Check for class-based indicators
    const className = node.className ? node.className.toString() : '';
    if (className.includes('math-inline') || className.includes('math-block')) {
      return true;
    }
    
    // 2. Check for data attributes
    const hasMathDataAttr = node.hasAttribute && (
      node.hasAttribute('data-math-format') ||
      node.hasAttribute('data-math-display') ||
      node.hasAttribute('data-math-original') ||
      node.hasAttribute('data-math') || 
      node.hasAttribute('data-latex') || 
      node.hasAttribute('data-mathml') || 
      node.hasAttribute('data-asciimath')
    );
    
    if (hasMathDataAttr) {
      return true;
    }
    
    // 3. Check for element types
    const nodeName = node.nodeName ? node.nodeName.toLowerCase() : '';
    if (nodeName === 'math') {
      return true;
    }
    
    // 4. Check for script elements with math content
    if (nodeName === 'script' && node.getAttribute) {
      const type = node.getAttribute('type') || '';
      return type.includes('math/');
    }
    
    // 5. Check for specially marked elements
    if (node.getAttribute && (
      node.getAttribute('math') || 
      node.getAttribute('latex') || 
      node.getAttribute('tex') || 
      node.getAttribute('asciimath')
    )) {
      return true;
    }
    
    return false;
  },
  
  replacement: (content, node, options) => {
    try {
      // Get display mode and content
      const isBlock = getDisplayMode(node);
      const mathContent = content.trim();
      
      // Skip empty content
      if (!mathContent) {
        return '';
      }
      
      // Get delimiters - try multiple sources in order of preference
      const inlineDelimiter = getDelimiter(node, 'inline', options);
      const blockDelimiter = getDelimiter(node, 'block', options);
      
      // Use appropriate delimiter based on display mode
      const delimiter = isBlock ? blockDelimiter : inlineDelimiter;
      
      // Handle spacing differently for block vs inline
      if (isBlock) {
        // For block math, add line breaks before and after
        return `\n\n${delimiter}${mathContent}${delimiter}\n\n`;
      } else {
        // For inline math, ensure there's proper spacing if needed
        // If the content is already at the beginning/end of a string, no need for additional spaces
        return delimiter + mathContent + delimiter;
      }
    } catch (error) {
      console.error('Error in math rule:', error);
      
      // Fallback - at least return the original content
      return content;
    }
  }
};

/**
 * Determine if math should be displayed in block mode
 */
function getDisplayMode(node) {
  // Check multiple indicators for display mode
  
  // 1. Check explicit data attribute
  if (node.getAttribute && node.getAttribute('data-math-display') === 'block') {
    return true;
  }
  
  // 2. Check class name
  const className = node.className ? node.className.toString() : '';
  if (className.includes('math-block') || className.includes('display-math')) {
    return true;
  }
  
  // 3. Check element type
  const isBlockElement = node.nodeName && ['div', 'p', 'figure'].includes(
    node.nodeName.toLowerCase()
  );
  
  if (isBlockElement) {
    return true;
  }
  
  // 4. Check script type for display mode
  if (node.nodeName && node.nodeName.toLowerCase() === 'script' && 
      node.getAttribute && node.getAttribute('type') && 
      node.getAttribute('type').includes('mode=display')) {
    return true;
  }
  
  // Default to inline
  return false;
}

/**
 * Get the appropriate delimiter from node attributes or options
 */
function getDelimiter(node, mode, options) {
  // Try multiple sources in order of preference
  
  // 1. Look for specific attribute on the node
  const delimAttr = node.getAttribute && node.getAttribute(`data-math-${mode}-delimiter`);
  if (delimAttr) {
    return delimAttr;
  }
  
  // 2. Look for general attribute with mode prefix
  if (node.getAttribute) {
    for (const attr of ['delimiter', 'delim', 'marker']) {
      const value = node.getAttribute(`data-${mode}-${attr}`);
      if (value) return value;
    }
  }
  
  // 3. Check for format-specific default from options
  const format = node.getAttribute && node.getAttribute('data-math-format');
  if (format && options && options[`${format}${mode.charAt(0).toUpperCase() + mode.slice(1)}Delimiter`]) {
    return options[`${format}${mode.charAt(0).toUpperCase() + mode.slice(1)}Delimiter`];
  }
  
  // 4. Use generic default from options
  if (options && options[`${mode}Delimiter`]) {
    return options[`${mode}Delimiter`];
  }
  
  // 5. Default fallbacks based on mode
  return mode === 'inline' ? '$' : '$$';
}