/**
 * Extract content from an element based on format
 */
export function extractContent(element: Element, format: string): string {
  // MathML elements - preserve the entire element
  if (format === 'mathml' && element.nodeName.toLowerCase() === 'math') {
    return element.outerHTML;
  }
  
  // Try multiple extraction methods in order of preference
  
  // 1. Check for format-specific data attributes
  if (element.hasAttribute(`data-${format}`)) {
    return element.getAttribute(`data-${format}`) || '';
  }
  
  // 2. Check for general math data attribute
  if (element.hasAttribute('data-math')) {
    return element.getAttribute('data-math') || '';
  }
  
  // 3. For script elements, use text content
  if (element.nodeName.toLowerCase() === 'script') {
    return element.textContent || '';
  }
  
  // 4. Check for format attribute
  if (element.hasAttribute(format)) {
    return element.getAttribute(format) || '';
  }
  
  // 5. Check for math attribute
  if (element.hasAttribute('math')) {
    return element.getAttribute('math') || '';
  }
  
  // 6. For MathML-containing elements that are not <math> themselves
  const mathChild = element.querySelector('math');
  if (mathChild) {
    return mathChild.outerHTML;
  }
  
  // 7. Fallback to element's text content
  return element.textContent || '';
}