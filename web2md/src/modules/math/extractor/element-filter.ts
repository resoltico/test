import { Logger } from '../../../shared/logger/console.js';

/**
 * Determine if we should skip this element (e.g., not actual math)
 */
export function shouldSkipElement(element: Element, logger: Logger): boolean {
  // Skip elements in <head>
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === 'head') {
      return true;
    }
    parent = parent.parentElement;
  }
  
  // For script elements, check if they look like math
  if (element.tagName.toLowerCase() === 'script') {
    const type = element.getAttribute('type') || '';
    if (!type.includes('math/') && !type.includes('tex') && !type.includes('latex')) {
      return true;
    }
    
    // Skip empty scripts
    const content = element.textContent || '';
    if (!content.trim()) {
      return true;
    }
  }
  
  // Always process <math> elements
  if (element.tagName.toLowerCase() === 'math') {
    return false;
  }
  
  // Check content for elements with data attributes
  const hasDataAttr = 
    element.hasAttribute('data-math') || 
    element.hasAttribute('data-latex') || 
    element.hasAttribute('data-mathml') || 
    element.hasAttribute('data-asciimath');
  
  if (hasDataAttr) {
    // Get the attribute value
    const attrValue = 
      element.getAttribute('data-math') || 
      element.getAttribute('data-latex') || 
      element.getAttribute('data-mathml') || 
      element.getAttribute('data-asciimath') || '';
    
    // Skip if empty
    if (!attrValue.trim()) {
      return true;
    }
    
    // Quick check for math-like content
    const hasMathSymbols = /[+\-*/=^_{}\\]/.test(attrValue);
    if (!hasMathSymbols) {
      return true;
    }
  }
  
  return false;
}