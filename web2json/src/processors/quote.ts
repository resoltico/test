import { Quote } from '../schema/quote.js';

/**
 * Process a blockquote element
 */
export function processQuote(blockquoteElement: Element): Quote {
  // Extract the quote content - preserve HTML markup
  const content = blockquoteElement.innerHTML;
  
  // Find the citation source if present
  let source: string | undefined;
  
  // Look for footer or cite elements
  const footer = blockquoteElement.querySelector('footer');
  if (footer) {
    source = footer.textContent || '';
  } else {
    const cite = blockquoteElement.querySelector('cite');
    if (cite) {
      source = cite.textContent || '';
    }
  }
  
  // Create the quote object
  const quote: Quote = { 
    content,
    children: []
  };
  
  // Add source if present
  if (source) {
    quote.source = source;
  }
  
  return quote;
}