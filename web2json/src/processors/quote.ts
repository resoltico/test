import { Quote } from '../schema/quote.js';
import { logger } from '../utils/logger.js';

/**
 * Process a blockquote element into structured JSON format
 */
export function processQuote(blockquoteElement: Element): Quote {
  logger.debug('Processing blockquote element');
  
  // Preserve HTML formatting in content
  const content = blockquoteElement.innerHTML;
  
  // Extract source information from footer or cite elements
  let source = extractQuoteSource(blockquoteElement);
  
  // Create the quote object
  const quote: Quote = {
    content
  };
  
  // Add source if present
  if (source) {
    quote.source = source;
  }
  
  return quote;
}

/**
 * Extract the quote source from footer or cite elements
 */
function extractQuoteSource(blockquoteElement: Element): string | undefined {
  // First check for footer element which is the standard way to cite a quote
  const footer = blockquoteElement.querySelector('footer');
  if (footer) {
    return footer.textContent || undefined;
  }
  
  // If no footer, check for cite element
  const cite = blockquoteElement.querySelector('cite');
  if (cite) {
    // If cite is inside a footer, it's already handled above
    const parentFooter = cite.closest('footer');
    if (!parentFooter) {
      return cite.textContent || undefined;
    }
  }
  
  // If no explicit citation found, try to find author attribution in other ways
  // E.g., last paragraph with dash, em dash, or "—" prefix
  const paragraphs = blockquoteElement.querySelectorAll('p');
  if (paragraphs.length > 0) {
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const text = lastParagraph.textContent || '';
    
    const attributionRegex = /^\s*[—–-]\s*(.+)$/;
    const match = text.match(attributionRegex);
    
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}
