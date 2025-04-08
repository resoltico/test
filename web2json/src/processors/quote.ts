import { Quote } from '../schema/quote.js';
import { logger } from '../utils/logger.js';
import { normalizeHtmlContent, normalizeTextContent } from '../utils/html.js';

/**
 * Process a blockquote element into structured JSON format
 */
export function processQuote(blockquoteElement: Element): Quote {
  logger.debug('Processing blockquote element');
  
  // Preserve HTML formatting in content
  const content = normalizeHtmlContent(blockquoteElement.innerHTML);
  
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
    return normalizeTextContent(footer.textContent || '');
  }
  
  // If no footer, check for cite element
  const cite = blockquoteElement.querySelector('cite');
  if (cite) {
    // If cite is inside a footer, it's already handled above
    const parentFooter = cite.closest('footer');
    if (!parentFooter) {
      // If there's text before the cite, combine them
      const citeText = cite.textContent || '';
      const parent = cite.parentElement;
      
      if (parent && parent !== blockquoteElement) {
        // Get parent's text with cite removed temporarily
        const originalHtml = parent.innerHTML;
        cite.remove();
        const precedingText = parent.textContent?.trim() || '';
        parent.innerHTML = originalHtml; // Restore original content
        
        if (precedingText) {
          return `${precedingText} ${citeText}`.trim();
        }
      }
      
      return citeText.trim();
    }
  }
  
  // If no explicit citation found, try to find author attribution in other ways
  // E.g., last paragraph with dash, em dash, or "—" prefix
  const paragraphs = blockquoteElement.querySelectorAll('p');
  if (paragraphs.length > 0) {
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const text = lastParagraph.textContent || '';
    
    // Look for attribution patterns
    // 1. Starting with dash: "- Author"
    // 2. Starting with em dash: "— Author"
    // 3. Format like "Author, Work"
    const attributionRegex = /^\s*[—–-]\s*(.+)$/;
    const match = text.match(attributionRegex);
    
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}