import * as cheerio from 'cheerio';
import type { QuoteSchema } from '../../models/elements/quote.js';
import { logger } from '../../utils/logger.js';

export function processQuote($quote: cheerio.Cheerio<cheerio.Element>): QuoteSchema {
  const result: QuoteSchema = {
    content: ''
  };

  // Get the main quote content, excluding footer/cite
  const $footer = $quote.find('footer');
  let mainContent;
  
  if ($footer.length) {
    // Clone the quote to safely remove the footer
    const $clonedQuote = $quote.clone();
    const $clonedFooter = $clonedQuote.find('footer');
    $clonedFooter.remove();
    mainContent = $clonedQuote.text().trim();
    
    // Process source information from footer
    const footerText = $footer.text().trim();
    const $cite = $footer.find('cite');
    
    if ($cite.length) {
      result.source = $cite.text().trim();
    } else if (footerText.startsWith('—') || footerText.startsWith('-')) {
      // Common format for attribution
      result.source = footerText.substring(1).trim();
    } else {
      result.source = footerText;
    }
  } else {
    // No footer, use all content
    mainContent = $quote.text().trim();
    
    // Check for cite element
    const $cite = $quote.find('cite');
    if ($cite.length) {
      const $clonedQuote = $quote.clone();
      const $clonedCite = $clonedQuote.find('cite');
      $clonedCite.remove();
      
      mainContent = $clonedQuote.text().trim();
      result.source = $cite.text().trim();
    }
  }
  
  result.content = mainContent;
  
  logger.debug(`Processed quote${result.source ? ' with source' : ''}`);
  return result;
}
