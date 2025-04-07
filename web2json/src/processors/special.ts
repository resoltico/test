import { logger } from '../utils/logger.js';

// Type definition for special content (math, dl, ol, ul, pre)
export type SpecialContent = {
  description: string;
  terms: { term: string; definition: string }[];
  code?: string;
  'ordered-list'?: string[];
  'unordered-list'?: string[];
};

/**
 * Process special content elements (math, dl, pre, ol, ul)
 */
export function processSpecialContent(element: Element): SpecialContent | null {
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
function processMathElement(mathElement: Element): SpecialContent {
  // Preserve the exact MathML content
  const content = mathElement.textContent || '';
  
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
function processDefinitionList(dlElement: Element): SpecialContent {
  const terms: { term: string; definition: string }[] = [];
  
  // Find all term/definition pairs
  const dtElements = dlElement.querySelectorAll('dt');
  
  for (let i = 0; i < dtElements.length; i++) {
    const dtElement = dtElements[i];
    const term = dtElement.textContent || '';
    
    // Find the corresponding dd element
    let definition = '';
    const ddElement = dtElement.nextElementSibling;
    
    if (ddElement && ddElement.tagName.toLowerCase() === 'dd') {
      definition = ddElement.textContent || '';
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
function processCodeBlock(preElement: Element): SpecialContent {
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
function processOrderedList(olElement: Element): SpecialContent {
  const items: string[] = [];
  
  // Extract all list items
  const liElements = olElement.querySelectorAll('li');
  for (const li of Array.from(liElements)) {
    items.push(li.textContent || '');
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
function processUnorderedList(ulElement: Element): SpecialContent {
  const items: string[] = [];
  
  // Extract all list items
  const liElements = ulElement.querySelectorAll('li');
  for (const li of Array.from(liElements)) {
    items.push(li.textContent || '');
  }
  
  return {
    description: 'Unordered list',
    terms: [{ term: 'List items', definition: 'Bulleted sequence' }],
    'unordered-list': items
  };
}
