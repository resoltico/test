import { Formula } from '../schema/section.js';
import { logger } from '../utils/logger.js';
import { normalizeTextContent, normalizeHtmlContent } from '../utils/html.js';

// Define DOM Node constants since Node is not globally available in Node.js
const ELEMENT_NODE = 1;  // Same as Node.ELEMENT_NODE in browsers
const TEXT_NODE = 3;     // Same as Node.TEXT_NODE in browsers

/**
 * Process special content as a formula
 * This handles various types of special content:
 * - Math expressions (MathML)
 * - Definition lists (dl)
 * - Code blocks (pre)
 * - Ordered lists (ol)
 * - Unordered lists (ul)
 */
export function processFormula(element: Element, type: string): Formula {
  logger.debug(`Processing formula of type: ${type}`);
  
  // Process based on element type
  switch (type.toLowerCase()) {
    case 'math':
      return processMathFormula(element);
    case 'dl':
      return processDefinitionList(element);
    case 'pre':
      return processCodeBlock(element);
    case 'ol':
      return processOrderedList(element);
    case 'ul':
      return processUnorderedList(element);
    default:
      // Default basic formula
      return {
        description: `Content of type ${type}`,
        terms: []
      };
  }
}

/**
 * Process a math element
 */
function processMathFormula(mathElement: Element): Formula {
  // For math elements, we extract the formula text or representation
  // and provide it as the description
  
  // First attempt to find the actual formula representation (e.g., "J = T × √S × (P / log(audience))")
  const mrow = mathElement.querySelector('mrow');
  
  let formulaText = '';
  if (mrow) {
    // Try to extract the formula in a readable format
    formulaText = extractMathFormula(mrow);
  }
  
  // Fallback to element's text content if we couldn't extract a formula
  if (!formulaText) {
    formulaText = mathElement.textContent?.trim() || 'Mathematical formula';
  }
  
  return {
    description: formulaText,
    terms: []
  };
}

/**
 * Extract a readable representation of a MathML formula
 */
function extractMathFormula(mrow: Element): string {
  // This function attempts to convert MathML to a readable string representation
  // It's a simplified approach and might not handle all complex formulas
  
  // Build the formula by traversing the math elements
  let formula = '';
  
  // Process each child node
  for (const node of Array.from(mrow.childNodes)) {
    if (node.nodeType === ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'mi': // Identifier
          formula += element.textContent?.trim() || '';
          break;
        case 'mo': // Operator
          formula += element.textContent?.trim() || '';
          break;
        case 'mn': // Number
          formula += element.textContent?.trim() || '';
          break;
        case 'msqrt': // Square root
          formula += '√(' + extractMathFormula(element) + ')';
          break;
        case 'mfrac': // Fraction
          const numerator = element.querySelector(':scope > *:first-child')?.textContent?.trim() || '';
          const denominator = element.querySelector(':scope > *:last-child')?.textContent?.trim() || '';
          formula += `(${numerator} / ${denominator})`;
          break;
        case 'msub': // Subscript
          const base = element.querySelector(':scope > *:first-child')?.textContent?.trim() || '';
          const sub = element.querySelector(':scope > *:last-child')?.textContent?.trim() || '';
          formula += `${base}_${sub}`;
          break;
        case 'msup': // Superscript
          const baseExp = element.querySelector(':scope > *:first-child')?.textContent?.trim() || '';
          const exp = element.querySelector(':scope > *:last-child')?.textContent?.trim() || '';
          formula += `${baseExp}^${exp}`;
          break;
        case 'mrow': // Row
          formula += extractMathFormula(element);
          break;
        default:
          formula += element.textContent?.trim() || '';
      }
    } else if (node.nodeType === TEXT_NODE) {
      formula += node.textContent?.trim() || '';
    }
  }
  
  return formula;
}

/**
 * Process a definition list (dl) element
 */
function processDefinitionList(dlElement: Element): Formula {
  const terms: { term: string; definition: string }[] = [];
  
  // Find all term/definition pairs
  const dtElements = dlElement.querySelectorAll('dt');
  
  for (let i = 0; i < dtElements.length; i++) {
    const dtElement = dtElements[i];
    const term = normalizeTextContent(dtElement.textContent || '');
    
    // Find the corresponding dd element
    let definition = '';
    const ddElement = dtElement.nextElementSibling;
    
    if (ddElement && ddElement.tagName.toLowerCase() === 'dd') {
      definition = normalizeTextContent(ddElement.textContent || '');
    }
    
    // Add the term-definition pair
    if (term) {
      terms.push({ term, definition });
    }
  }
  
  return {
    description: 'Definition list',
    terms
  };
}

/**
 * Process a code block (pre) element
 */
function processCodeBlock(preElement: Element): Formula {
  // Look for a code element within the pre
  const codeElement = preElement.querySelector('code');
  let code = '';
  
  if (codeElement) {
    // Preserve code formatting exactly as is
    code = codeElement.textContent || '';
  } else {
    code = preElement.textContent || '';
  }
  
  return {
    description: 'Code block',
    terms: [],
    code
  };
}

/**
 * Process an ordered list (ol) element
 */
function processOrderedList(olElement: Element): Formula {
  const items: string[] = [];
  
  // Extract all list items
  const liElements = olElement.querySelectorAll('li');
  for (const li of Array.from(liElements)) {
    items.push(normalizeTextContent(li.textContent || ''));
  }
  
  return {
    description: 'Ordered list',
    terms: [],
    'ordered-list': items
  };
}

/**
 * Process an unordered list (ul) element
 */
function processUnorderedList(ulElement: Element): Formula {
  const items: string[] = [];
  
  // Extract all list items
  const liElements = ulElement.querySelectorAll('li');
  for (const li of Array.from(liElements)) {
    items.push(normalizeTextContent(li.textContent || ''));
  }
  
  return {
    description: 'Unordered list',
    terms: [],
    'unordered-list': items
  };
}