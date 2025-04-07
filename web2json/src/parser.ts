import { JSDOM } from 'jsdom';
import { Document } from './schema/document.js';
import { Section } from './schema/section.js';
import { 
  getDocumentTitle, 
  getElementId,
  getHeadingLevel,
  isHeading,
  isSectionContainer 
} from './utils/html.js';
import { 
  processSection,
  buildSectionHierarchy,
  processQuote
} from './processors/index.js';
import { logger } from './utils/logger.js';

/**
 * Parse an HTML document and convert it to our JSON structure
 */
export function parseDocument(dom: JSDOM): Document {
  logger.info('Analyzing document structure');
  
  const document = dom.window.document;
  
  // Extract the document title
  const title = getDocumentTitle(document);
  
  // Start with an empty document structure
  const result: Document = {
    title,
    content: []
  };
  
  // Process the document body
  processDocumentBody(document.body, result);
  
  logger.success('Document structure analysis complete');
  return result;
}

/**
 * Process the document body and extract the content structure
 */
function processDocumentBody(body: HTMLElement, result: Document): void {
  // Find all explicit section containers
  const explicitSections = Array.from(body.querySelectorAll('section, article, aside'));
  
  // If we have explicit sections, process them
  if (explicitSections.length > 0) {
    logger.info(`Found ${explicitSections.length} explicit section elements`);
    
    // Process sections individually
    explicitSections.forEach(sectionElement => {
      // Skip nested sections as they'll be handled by their parent
      if (sectionElement.parentElement && 
          (sectionElement.parentElement.tagName === 'SECTION' || 
           sectionElement.parentElement.tagName === 'ARTICLE' || 
           sectionElement.parentElement.tagName === 'ASIDE')) {
        return;
      }
      
      if (sectionElement.tagName === 'ARTICLE') {
        // Process article as a special container with sections
        const article = {
          type: 'article' as const,
          id: getElementId(sectionElement, 'article'),
          children: processArticleSections(sectionElement)
        };
        
        result.content.push(article);
      } else {
        // Process regular section
        const section = processSection(sectionElement);
        result.content.push(section);
      }
    });
  } else {
    // No explicit sections, use implicit sections based on headings
    logger.info('No explicit sections found, creating implicit sections based on headings');
    
    const sections = createImplicitSections(body);
    result.content = sections;
  }
  
  // Process other top-level elements
  processSpecialElements(body, result);
}

/**
 * Process the sections within an article
 */
function processArticleSections(article: Element): Section[] {
  // Find all section elements within the article
  const sectionElements = Array.from(article.querySelectorAll('section'));
  
  // If we have explicit sections, process them
  if (sectionElements.length > 0) {
    // Process sections individually
    return sectionElements.map(processSection);
  }
  
  // No explicit sections, use implicit sections based on headings
  return createImplicitSections(article);
}

/**
 * Create implicit sections based on heading elements
 */
function createImplicitSections(container: Element): Section[] {
  // Find all heading elements
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(heading => {
      // Filter out headings that are within explicit sections
      const closestSection = heading.closest('section, article, aside');
      return !closestSection || closestSection === container;
    });
  
  // If no headings, create a single section for the container
  if (headings.length === 0) {
    return [createSectionFromContent(container)];
  }
  
  // Create sections based on headings
  const sections: Section[] = [];
  
  headings.forEach((heading, index) => {
    // Determine the content range for this section
    const startNode = heading;
    const endNode = index < headings.length - 1 ? headings[index + 1] : null;
    
    // Create a section for this heading
    const section = createSectionFromHeading(heading, startNode, endNode);
    sections.push(section);
  });
  
  // Build the hierarchy based on heading levels
  return buildSectionHierarchy(sections);
}

/**
 * Create a section from a heading element and its following content
 */
function createSectionFromHeading(
  heading: Element, 
  startNode: Element, 
  endNode: Element | null
): Section {
  // Extract heading info
  const title = heading.textContent || '';
  const level = getHeadingLevel(heading) || 1;
  const id = getElementId(heading, 'section');
  
  // Collect content elements between startNode and endNode
  const content: string[] = [];
  let currentNode = startNode.nextSibling;
  
  while (currentNode && currentNode !== endNode) {
    if (currentNode.nodeType === 1) { // Element node
      const element = currentNode as Element;
      
      // Skip headings and containers
      if (!isHeading(element) && !isSectionContainer(element)) {
        if (element.tagName === 'P') {
          content.push(element.innerHTML);
        }
      }
    }
    
    currentNode = currentNode.nextSibling;
  }
  
  // Create the section
  return {
    type: 'section',
    id,
    title,
    level,
    content,
    children: []
  };
}

/**
 * Create a section from container content
 */
function createSectionFromContent(container: Element): Section {
  // Create a default section
  const section: Section = {
    type: 'section',
    id: getElementId(container),
    content: [],
    children: []
  };
  
  // Extract paragraphs as content
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (p.innerHTML.trim()) {
      section.content.push(p.innerHTML);
    }
  });
  
  return section;
}

/**
 * Process special top-level elements like blockquotes, search, footer
 */
function processSpecialElements(container: Element, result: Document): void {
  // Process blockquotes
  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach(blockquote => {
    // Skip nested blockquotes
    if (blockquote.parentElement && blockquote.parentElement.tagName === 'BLOCKQUOTE') {
      return;
    }
    
    const quote = {
      type: 'quote' as const,
      content: blockquote.innerHTML,
      source: '',
      children: []
    };
    
    // Extract footer if present
    const footer = blockquote.querySelector('footer');
    if (footer) {
      quote.source = footer.textContent || '';
    }
    
    result.content.push(quote);
  });
  
  // Process search elements
  const search = container.querySelector('search');
  if (search) {
    result.content.push({
      type: 'search',
      content: search.textContent || 'Search',
      children: []
    });
  }
  
  // Process footer
  const footer = container.querySelector('footer');
  if (footer) {
    const footerContent = Array.from(footer.children).map(child => child.innerHTML);
    
    result.content.push({
      type: 'footer',
      content: footerContent,
      children: []
    });
  }
}
