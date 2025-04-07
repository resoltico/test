// src/processors/special.ts
import * as cheerio from 'cheerio';
import { Formula } from '../schema/section.js';
import { cleanHtmlContent, extractTextContent } from '../utils/html.js';

/**
 * Process formula/math content
 */
export function processFormula($: cheerio.CheerioAPI, element: cheerio.Element): Formula {
  const $element = $(element);
  const formula: Formula = {};
  
  // Extract formula description
  const $description = $element.find('math');
  if ($description.length > 0) {
    formula.description = cleanHtmlContent($description.html() || '');
  } else {
    // If no math element, use the entire content
    formula.description = cleanHtmlContent($element.html() || '');
  }
  
  // Extract definition list if present
  const $dl = $element.find('dl');
  if ($dl.length > 0) {
    const terms: { term: string; definition: string }[] = [];
    
    $dl.find('dt').each((i, dt) => {
      const $dt = $(dt);
      const $dd = $dt.next('dd');
      
      if ($dd.length > 0) {
        terms.push({
          term: extractTextContent($dt.html() || ''),
          definition: extractTextContent($dd.html() || '')
        });
      }
    });
    
    if (terms.length > 0) {
      formula.terms = terms;
    }
  }
  
  // Extract code sample if present
  const $code = $element.find('pre code');
  if ($code.length > 0) {
    formula.code = $code.text();
  }
  
  // Extract ordered list if present
  const $ol = $element.find('ol');
  if ($ol.length > 0) {
    formula['ordered-list'] = $ol.find('li')
      .map((_, li) => extractTextContent($(li).html() || ''))
      .get();
  }
  
  // Extract unordered list if present
  const $ul = $element.find('ul');
  if ($ul.length > 0) {
    formula['unordered-list'] = $ul.find('li')
      .map((_, li) => extractTextContent($(li).html() || ''))
      .get();
  }
  
  return formula;
}

/**
 * Process a search element
 */
export function processSearch($: cheerio.CheerioAPI, element: cheerio.Element): { type: string; content: string } {
  const $element = $(element);
  
  // Extract search input placeholder or text content
  const $input = $element.find('input[type="search"]');
  let searchContent = '';
  
  if ($input.length > 0) {
    searchContent = $input.attr('placeholder') || $input.val() as string || 'Search';
  } else {
    searchContent = extractTextContent($element.html() || '');
  }
  
  return {
    type: 'search',
    content: searchContent
  };
}
