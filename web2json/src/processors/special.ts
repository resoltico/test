import { normalizeTextContent } from '../utils/html.js';

type SpecialContent = {
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
  // Extract MathML content
  const mathContent = mathElement.textContent || '';
  
  // Extract the math formula description
  return {
    description: normalizeTextContent(mathContent),
    // Always provide a non-empty terms array to satisfy schema requirements
    terms: [{ term: "Mathematical Formula", definition: "Formula expression" }]
  };
}

/**
 * Process a definition list
 */
function processDefinitionList(dlElement: Element): SpecialContent {
  const terms: { term: string; definition: string }[] = [];
  
  // Get all dt and dd elements
  const dtElements = dlElement.querySelectorAll('dt');
  const ddElements = dlElement.querySelectorAll('dd');
  
  // Process terms and definitions
  for (let i = 0; i < dtElements.length; i++) {
    const term = normalizeTextContent(dtElements[i].textContent || '');
    const definition = i < ddElements.length 
      ? normalizeTextContent(ddElements[i].textContent || '')
      : '';
    
    if (term) {
      terms.push({ term, definition });
    }
  }
  
  // Ensure terms is never empty, even if no terms were found
  if (terms.length === 0) {
    terms.push({ term: "No terms found", definition: "" });
  }
  
  return {
    description: 'Definition list',
    terms
  };
}

/**
 * Process a code block
 */
function processCodeBlock(preElement: Element): SpecialContent {
  // Look for a code element within the pre
  const codeElement = preElement.querySelector('code');
  const code = codeElement 
    ? codeElement.textContent || ''
    : preElement.textContent || '';
  
  return {
    description: 'Code block',
    terms: [{ term: "Code snippet", definition: "Source code" }],
    code
  };
}

/**
 * Process an ordered list
 */
function processOrderedList(olElement: Element): SpecialContent {
  const items: string[] = [];
  
  // Extract list items
  const liElements = olElement.querySelectorAll('li');
  for (const li of liElements) {
    items.push(normalizeTextContent(li.textContent || ''));
  }
  
  return {
    description: 'Ordered list',
    terms: [{ term: "List items", definition: "Numbered sequence" }],
    'ordered-list': items
  };
}

/**
 * Process an unordered list
 */
function processUnorderedList(ulElement: Element): SpecialContent {
  const items: string[] = [];
  
  // Extract list items
  const liElements = ulElement.querySelectorAll('li');
  for (const li of liElements) {
    items.push(normalizeTextContent(li.textContent || ''));
  }
  
  return {
    description: 'Unordered list',
    terms: [{ term: "List items", definition: "Bulleted sequence" }],
    'unordered-list': items
  };
}
