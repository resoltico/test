/**
 * Determine if an element should be displayed in block mode
 * This uses a variety of heuristics without hardcoding specific cases
 */
export function detectDisplayMode(element: Element): boolean {
  // Get document context for more accurate analysis
  const document = element.ownerDocument;
  
  // First check for explicit display mode indicators
  if (element.getAttribute('display') === 'block' || 
      element.getAttribute('data-display') === 'block' ||
      element.getAttribute('data-math-display') === 'block') {
    return true;
  }
  
  // Check for class indicators
  if (element.classList.contains('display-math') || 
      element.classList.contains('math-display') ||
      element.classList.contains('block') ||
      element.classList.contains('equation')) {
    return true;
  }
  
  // Check script type for display mode
  if (element.nodeName.toLowerCase() === 'script') {
    const type = element.getAttribute('type') || '';
    if (type.includes('mode=display')) {
      return true;
    }
    
    // Check for display style in the content
    const content = element.textContent || '';
    if (content.includes('\\displaystyle')) {
      return true;
    }
  }
  
  // Check MathML display attribute
  if (element.nodeName.toLowerCase() === 'math' && 
      (element.getAttribute('display') === 'block' || element.getAttribute('mode') === 'display')) {
    return true;
  }
  
  // STRUCTURAL CONTEXT ANALYSIS
  
  // 1. Check if element is a block level element itself
  const isBlockElement = ['div', 'p', 'figure', 'center', 'section', 'article'].includes(
    element.nodeName.toLowerCase()
  );
  if (isBlockElement) {
    return true;
  }
  
  // 2. Check if element is the only significant child of a block element
  const parent = element.parentElement;
  if (parent) {
    const isBlockParent = ['div', 'p', 'figure', 'center', 'section', 'article'].includes(
      parent.nodeName.toLowerCase()
    );
    
    if (isBlockParent) {
      // Count significant siblings (ignore text nodes with only whitespace)
      let significantSiblings = 0;
      for (let i = 0; i < parent.childNodes.length; i++) {
        const child = parent.childNodes[i];
        // Skip text nodes that are just whitespace
        if (child.nodeType === 3 && child.textContent?.trim() === '') {
          continue;
        }
        significantSiblings++;
      }
      
      // If this element is the only significant child, treat as block
      if (significantSiblings === 1) {
        return true;
      }
    }
  }
  
  // 3. Check for spacing context - if element is surrounded by blank lines
  let prevSibling = element.previousSibling;
  let nextSibling = element.nextSibling;
  
  // Skip whitespace text nodes
  while (prevSibling && prevSibling.nodeType === 3 && prevSibling.textContent?.trim() === '') {
    prevSibling = prevSibling.previousSibling;
  }
  
  while (nextSibling && nextSibling.nodeType === 3 && nextSibling.textContent?.trim() === '') {
    nextSibling = nextSibling.nextSibling;
  }
  
  // If no significant siblings, likely a standalone block
  if (!prevSibling || !nextSibling) {
    return true;
  }
  
  // If surrounded by block breaks, likely a block display
  const blockElements = ['DIV', 'P', 'BR', 'SECTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE'];
  
  const isPrevBlock = prevSibling.nodeName && blockElements.includes(
    prevSibling.nodeName.toUpperCase()
  );
  
  const isNextBlock = nextSibling.nodeName && blockElements.includes(
    nextSibling.nodeName.toUpperCase()
  );
  
  if (isPrevBlock && isNextBlock) {
    return true;
  }
  
  // 4. Content-based heuristics - more complex equations are more likely to be block displayed
  const content = element.textContent || '';
  
  // Check for equation environment markers
  if (content.includes('\\begin{align') || 
      content.includes('\\begin{equation') || 
      content.includes('\\begin{gather') ||
      content.includes('\\begin{multline')) {
    return true;
  }
  
  // Check for complex layout that suggests a display equation
  if (content.includes('\\frac') || 
      content.includes('\\sum') || 
      content.includes('\\int') ||
      content.includes('\\prod')) {
    return true;
  }
  
  // If the content is relatively long, it's more likely to be a display equation
  if (content.length > 30 && 
      (content.includes('\\') || content.includes('_') || content.includes('^'))) {
    return true;
  }
  
  // 5. Check for semantic context (if within a paragraph vs. standalone)
  // For MathML, get the parent text content without this element
  if (element.nodeName.toLowerCase() === 'math') {
    const parent = element.parentElement;
    if (parent) {
      // Clone parent to avoid modifying the DOM
      const clonedParent = parent.cloneNode(true) as Element;
      
      // Find and remove this math element from the clone
      const clonedMath = clonedParent.querySelector('math');
      if (clonedMath) {
        clonedMath.parentNode?.removeChild(clonedMath);
      }
      
      // Check if there's substantial text around the math
      const surroundingText = clonedParent.textContent || '';
      if (surroundingText.trim().length < 10) {
        // Little text around the math, likely a display equation
        return true;
      }
    }
  }
  
  // 6. Check if inside a heading or list item - these are typically inline
  let ancestor = element.parentElement;
  while (ancestor) {
    const tagName = ancestor.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'th', 'td'].includes(tagName)) {
      // Math in headings and list items is typically inline
      return false;
    }
    ancestor = ancestor.parentElement;
  }
  
  // Default to inline math if no block indicators found
  return false;
}