// src/processors/quote.ts
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { Quote } from '../schema/content.js';
import { cleanHtmlContent, extractTextContent } from '../utils/html.js';

/**
 * Process a blockquote element
 */
export function processQuote($: cheerio.CheerioAPI, quoteElement: Element): Quote {
  const $quote = $(quoteElement);
  
  // Extract the content, removing any citation elements
  const $content = $quote.clone();
  $content.find('cite, footer').remove();
  
  // Extract source from footer or cite element
  const $source = $quote.find('footer, cite');
  
  const quote: Quote = {
    content: cleanHtmlContent($content.html() || '')
  };
  
  if ($source.length > 0) {
    quote.source = extractTextContent($source.html() || '');
  }
  
  return quote;
}
