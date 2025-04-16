/**
 * Advanced math expression handling rule
 * Works with preprocessed math elements
 */
export default {
  name: 'math',
  
  filter: (node) => {
    // Match preprocessed math elements and fallback to traditional detection
    const nodeName = node.nodeName.toLowerCase();
    const className = node.className || '';
    
    // Check for preprocessed elements first
    if (className === 'math-inline' || className === 'math-block') {
      return true;
    }
    
    // Fallback detection for any elements not caught by preprocessing
    return nodeName === 'math' || 
           (nodeName === 'span' && (className.includes('math') || node.hasAttribute('data-math'))) ||
           (nodeName === 'div' && (className.includes('math') || node.hasAttribute('data-math'))) ||
           node.hasAttribute('data-math-content') || 
           node.hasAttribute('data-latex') ||
           (nodeName === 'script' && 
            (node.getAttribute('type') === 'math/tex' || 
             node.getAttribute('type') === 'math/asciimath' ||
             node.getAttribute('type')?.includes('math')));
  },
  
  replacement: (content, node) => {
    try {
      // Get display mode
      const isBlock = 
        node.className === 'math-block' || 
        node.getAttribute('data-math-display') === 'block' ||
        node.nodeName.toLowerCase() === 'div' ||
        node.getAttribute('display') === 'block';
      
      // Get math content
      let mathContent = '';
      
      // Case 1: Preprocessed elements
      if (node.className === 'math-inline' || node.className === 'math-block') {
        mathContent = node.textContent.trim();
      } 
      // Case 2: Elements with data attributes
      else if (node.hasAttribute('data-math') || node.hasAttribute('data-latex')) {
        mathContent = node.getAttribute('data-math') || node.getAttribute('data-latex') || '';
      }
      // Case 3: Script elements
      else if (node.nodeName.toLowerCase() === 'script') {
        mathContent = node.textContent.trim();
      }
      // Case 4: MathML elements
      else if (node.nodeName.toLowerCase() === 'math') {
        // For MathML, use the content that was processed during preprocessing
        // Or extract text content if processing wasn't done
        mathContent = extractMathMLContent(node);
      }
      // Fallback: Use text content
      else {
        mathContent = node.textContent.trim();
      }
      
      // Skip empty content
      if (!mathContent) {
        return '';
      }
      
      // Clean up math content
      mathContent = cleanMathContent(mathContent);
      
      // Format with appropriate delimiters
      const delimiter = isBlock ? '$$' : '$';
      return `${delimiter}${mathContent}${delimiter}${isBlock ? '\n\n' : ''}`;
    } catch (error) {
      // Fallback for any errors
      console.error('Error processing math:', error);
      
      // Just return the text content as a basic fallback
      const textContent = node.textContent || '';
      const isBlock = 
        node.className === 'math-block' || 
        node.getAttribute('data-math-display') === 'block' ||
        node.nodeName.toLowerCase() === 'div' ||
        node.getAttribute('display') === 'block';
      
      const delimiter = isBlock ? '$$' : '$';
      return `${delimiter}${textContent.trim()}${delimiter}${isBlock ? '\n\n' : ''}`;
    }
  }
};

/**
 * Extract content from MathML with some structure preservation
 */
function extractMathMLContent(node) {
  try {
    // If node is already a string (from preprocessor that extracted MathML)
    if (typeof node === 'string') {
      return node;
    }
    
    // If it's an actual MathML node, get a simplified LaTeX-like representation
    let result = '';
    
    // Handle specific MathML elements
    if (node.nodeName.toLowerCase() === 'math') {
      // Process all child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        result += extractMathMLContent(node.childNodes[i]);
      }
    } 
    // Handle fractions
    else if (node.nodeName.toLowerCase() === 'mfrac') {
      const num = getChildContent(node, 0);
      const denom = getChildContent(node, 1);
      result = `\\frac{${num}}{${denom}}`;
    }
    // Handle superscripts
    else if (node.nodeName.toLowerCase() === 'msup') {
      const base = getChildContent(node, 0);
      const exp = getChildContent(node, 1);
      result = `${base}^{${exp}}`;
    }
    // Handle subscripts
    else if (node.nodeName.toLowerCase() === 'msub') {
      const base = getChildContent(node, 0);
      const sub = getChildContent(node, 1);
      result = `${base}_{${sub}}`;
    }
    // Handle square roots
    else if (node.nodeName.toLowerCase() === 'msqrt') {
      result = `\\sqrt{`;
      for (let i = 0; i < node.childNodes.length; i++) {
        result += extractMathMLContent(node.childNodes[i]);
      }
      result += `}`;
    }
    // Handle basic elements (mi, mn, mo)
    else if (['mi', 'mn', 'mo'].includes(node.nodeName.toLowerCase())) {
      // Get text content
      result = node.textContent;
      
      // Special handling for operators
      if (node.nodeName.toLowerCase() === 'mo') {
        // Convert common operators to LaTeX
        if (result.includes('×') || result.includes('⋅') || result.includes('·')) {
          result = '\\cdot';
        } else if (result.includes('≤')) {
          result = '\\leq';
        } else if (result.includes('≥')) {
          result = '\\geq';
        } else if (result.includes('±')) {
          result = '\\pm';
        }
      }
    }
    // Handle mrow (just concatenate children)
    else if (node.nodeName.toLowerCase() === 'mrow') {
      for (let i = 0; i < node.childNodes.length; i++) {
        result += extractMathMLContent(node.childNodes[i]);
      }
    }
    // Handle text nodes
    else if (node.nodeType === 3) { // Text node
      result = node.textContent;
    }
    // Other node types
    else if (node.childNodes) {
      // Process child nodes for other elements
      for (let i = 0; i < node.childNodes.length; i++) {
        result += extractMathMLContent(node.childNodes[i]);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting MathML content:', error);
    return node.textContent || '';
  }
}

/**
 * Get content of a specific child node
 */
function getChildContent(node, index) {
  if (node.childNodes && node.childNodes.length > index) {
    return extractMathMLContent(node.childNodes[index]);
  }
  return '';
}

/**
 * Clean up the math content
 */
function cleanMathContent(content) {
  return content
    // Clean up HTML entities
    .replace(/\&lt;/g, '<')
    .replace(/\&gt;/g, '>')
    .replace(/\&amp;/g, '&')
    .replace(/\&quot;/g, '"')
    .replace(/\&apos;/g, "'")
    .replace(/\&#39;/g, "'")
    .replace(/\&#x27;/g, "'")
    .replace(/\&#x2F;/g, "/")
    
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}