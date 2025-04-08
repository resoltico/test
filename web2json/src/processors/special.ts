import { logger } from '../utils/logger.js';
import { normalizeTextContent, normalizeHtmlContent } from '../utils/html.js';
import { Formula } from '../schema/section.js';
import { SearchContent, FooterContent } from '../schema/document.js';

/**
 * Process special content elements (math, dl, pre, ol, ul)
 */
export function processSpecialContent(element: Element): Formula | null {
  const tagName = element.tagName.toLowerCase();
  
  logger.debug(`Processing special element: ${tagName}`);
  
  // Process based on element type
  switch (tagName) {
    case 'math':
      return processMathElement(element);
    case 'dl':
      return processDefinitionList(element);
    case 'pre':
      return processCodeBlock(element);
    case 'ol':
      return processOrderedList(element);
    case 'ul':
      return processUnorderedList(element);
    default:
      return null;
  }
}

/**
 * Process a math element
 */
function processMathElement(mathElement: Element): Formula {
  // Preserve the exact MathML content
  const content = normalizeHtmlContent(mathElement.outerHTML);
  
  return {
    description: content,
    terms: [
      { 
        term: 'Mathematical Expression', 
        definition: 'Formula represented in MathML format' 
      }
    ]
  };
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
    terms: terms.length > 0 ? terms : [{ term: 'No terms found', definition: '' }]
  };
}

/**
 * Process a code block (pre) element
 */
function processCodeBlock(preElement: Element): Formula {
  // Look for a code element within the pre
  const codeElement = preElement.querySelector('code');
  const code = codeElement 
    ? codeElement.textContent || ''
    : preElement.textContent || '';
  
  return {
    description: 'Code block',
    terms: [{ term: 'Code', definition: 'Source code' }],
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
    terms: [{ term: 'List items', definition: 'Numbered sequence' }],
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
    terms: [{ term: 'List items', definition: 'Bulleted sequence' }],
    'unordered-list': items
  };
}

/**
 * Process a search element
 */
export function processSearch(searchElement: Element): SearchContent {
  return {
    type: 'search',
    content: normalizeHtmlContent(searchElement.innerHTML),
    children: []
  };
}

/**
 * Process header or footer elements
 */
export function processHeaderFooter(element: Element, type: 'header' | 'footer'): FooterContent | null {
  if (!element) return null;
  
  // Extract content paragraphs
  const contentElements = Array.from(element.children);
  const content = contentElements.map(el => normalizeHtmlContent(el.outerHTML));
  
  if (content.length === 0) {
    return null;
  }
  
  return {
    type: type as 'footer', // Cast to make TypeScript happy
    content,
    children: []
  };
}
