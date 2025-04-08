import { JSDOM } from 'jsdom';
import { Document } from './schema/document.js';
import { logger } from './utils/logger.js';
import { getDocumentTitle } from './utils/html.js';
import {
  processSection,
  processArticle, 
  processAside,
  createSectionsFromHeadings
} from './parser/sections.js';
import {
  processQuote,
  processSearch,
  processHeaderFooter
} from './processors/index.js';
import { createContentSection } from './parser/content.js';

/**
 * Parse HTML document and convert to structured JSON
 * Main entry point for the parsing process
 */
export function parseDocument(dom: JSDOM): Document {
  logger.info('Starting document parsing with improved hierarchy handling');
  
  const document = dom.window.document;
  const title = getDocumentTitle(document);
  
  // Initialize result document
  const result: Document = {
    title,
    content: []
  };
  
  // Process the body content
  if (!document.body) {
    logger.warning('Document body not found');
    return result;
  }
  
  // First extract the header if present
  const headerElement = document.querySelector('header');
  if (headerElement) {
    const headerContent = processHeaderFooter(headerElement, 'header');
    if (headerContent) {
      result.content.push(headerContent);
    }
  }
  
  // Find the content container (main or body if no main)
  const mainElement = document.querySelector('main') || document.body;
  
  // Process top-level sections and content
  processBodyContent(mainElement, result);
  
  // Process footer if present
  const footerElement = document.querySelector('footer');
  if (footerElement) {
    const footerContent = processHeaderFooter(footerElement, 'footer');
    if (footerContent) {
      result.content.push(footerContent);
    }
  }
  
  logger.success('Document parsing complete');
  return result;
}

/**
 * Process the main content of the document body
 */
function processBodyContent(container: Element, result: Document): void {
  logger.info('Processing main body content');
  
  // First, identify all sections and articles at the top level
  const topLevelContainers = Array.from(container.querySelectorAll(':scope > section, :scope > article, :scope > aside'));
  
  if (topLevelContainers.length > 0) {
    // Process explicit sections first
    for (const element of topLevelContainers) {
      if (element.tagName.toLowerCase() === 'section') {
        const section = processSection(element);
        result.content.push(section);
      } else if (element.tagName.toLowerCase() === 'article') {
        const article = processArticle(element);
        result.content.push(article);
      } else if (element.tagName.toLowerCase() === 'aside') {
        const aside = processAside(element);
        result.content.push(aside);
      }
    }
  } else {
    // No explicit sections - create sections based on headings
    const sections = createSectionsFromHeadings(container);
    result.content.push(...sections);
  }
  
  // Process other top-level elements that aren't sections/articles
  processNonSectionElements(container, result);
}

/**
 * Process other top-level elements that aren't sections/articles
 */
function processNonSectionElements(container: Element, result: Document): void {
  // Process blockquotes
  const blockquotes = Array.from(container.querySelectorAll(':scope > blockquote'));
  for (const blockquote of blockquotes) {
    const quote = processQuote(blockquote);
    result.content.push({
      type: 'quote',
      ...quote,
      children: []
    });
  }
  
  // Process search elements
  const searchElements = Array.from(container.querySelectorAll(':scope > search'));
  for (const search of searchElements) {
    result.content.push(processSearch(search));
  }
  
  // Process standalone divs with content
  const divs = Array.from(container.querySelectorAll(':scope > div'));
  for (const div of divs) {
    // Skip if it contains sections or articles
    if (div.querySelector('section, article, aside')) {
      continue;
    }
    
    // Check if it has a heading
    const heading = div.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      // Create sections based on headings
      const sections = createSectionsFromHeadings(div);
      result.content.push(...sections);
    } else if (div.querySelector('p, table, form, figure, dl, pre, ol, ul')) {
      // Create a single section for the content
      const contentSection = createContentSection(div, (el, prefix) => {
        // Generate simple ID for the element
        return `${prefix}-${Math.random().toString(36).substring(2, 12)}`;
      });
      result.content.push(contentSection);
    }
  }
}