import { Quote } from '../schema/quote.js';
import { extractFormattedContent, normalizeTextContent } from '../utils/html.js';

/**
 * Process a blockquote element
 */
export function processQuote(blockquoteElement: Element): Quote {
  // Extract the quote content
  let content = '';
  
  // Find paragraphs within the blockquote
  const paragraphs = blockquoteElement.querySelectorAll('p');
  if (paragraphs.length > 0) {
    content = Array.from(paragraphs)
      .map(p => extractFormattedContent(p))
      .join(' ');
  } else {
    // No paragraphs found, use the full blockquote content
    content = extractFormattedContent(blockquoteElement);
  }
  
  // Find the citation source if present
  let source: string | undefined;
  
  // Look for footer or cite elements
  const footer = blockquoteElement.querySelector('footer');
  if (footer) {
    source = normalizeTextContent(footer.textContent || '');
  } else {
    const cite = blockquoteElement.querySelector('cite');
    if (cite) {
      source = normalizeTextContent(cite.textContent || '');
    }
  }
  
  // Create the quote object
  const quote: Quote = { content };
  
  // Add source if present
  if (source) {
    quote.source = source;
  }
  
  return quote;
}
