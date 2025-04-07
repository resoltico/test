import { JSDOM } from 'jsdom';
import { Document } from './schema/document.js';
import { Section } from './schema/section.js';
import { Table } from './schema/table.js';
import { Figure } from './schema/figure.js';
import { Form } from './schema/form.js';
import { Quote } from './schema/quote.js';
import { logger } from './utils/logger.js';
import { 
  extractFormattedContent, 
  getDocumentTitle, 
  getElementId, 
  getHeadingLevel, 
  isHeading 
} from './utils/html.js';
import { 
  processSection,
  processTable,
  processForm,
  processFigure,
  processQuote
} from './processors/index.js';

/**
 * Parse HTML document and convert to structured JSON
 */
export function parseDocument(dom: JSDOM): Document {
  logger.info('Starting document parsing');
  
  const document = dom.window.document;
  const title = getDocumentTitle(document);
  
  // Initialize result document
  const result: Document = {
    title,
    content: []
  };
  
  // Process the main content structure
  processDocumentContent(document.body, result);
  
  logger.success('Document parsing complete');
  return result;
}

/**
 * Process the body element to extract the document's main content structure
 */
function processDocumentContent(body: HTMLElement, result: Document): void {
  // First process sections and structural elements
  processMainStructure(body, result);
  
  // Then process standalone elements (blockquotes, search, footer, etc.)
  processStandaloneElements(body, result);
}

/**
 * Process the main structural content (sections, articles, etc.)
 */
function processMainStructure(container: HTMLElement, result: Document): void {
  // Get all top-level structure elements (sections, articles, etc.)
  const topLevelElements = getTopLevelStructureElements(container);
  
  logger.info(`Found ${topLevelElements.length} top-level structural elements`);
  
  if (topLevelElements.length > 0) {
    // Process explicit structure elements
    for (const element of topLevelElements) {
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'section') {
        // Process as section
        const section = processSection(element);
        result.content.push(section);
      } 
      else if (tagName === 'article') {
        // Process as article
        const article = {
          type: 'article' as const,
          id: getElementId(element, 'article'),
          children: processArticleContent(element)
        };
        result.content.push(article);
      }
      else if (tagName === 'aside') {
        // Process as a special section
        const section = processSection(element);
        result.content.push(section);
      }
    }
  } else {
    // No explicit structure - create implicit structure based on headings
    logger.info('No explicit structure found - creating implicit structure from headings');
    const sections = createImplicitSectionsFromHeadings(container);
    result.content.push(...sections);
  }
}

/**
 * Extract sections from article content - handles both explicit and implicit structures
 */
function processArticleContent(article: Element): Section[] {
  // Look for explicit sections within the article
  const sectionElements = Array.from(article.querySelectorAll(':scope > section'));
  
  if (sectionElements.length > 0) {
    // Process explicit sections
    return sectionElements.map(el => processSection(el));
  } else {
    // Create implicit sections based on headings
    // Cast article to Element since createImplicitSectionsFromHeadings accepts Element
    return createImplicitSectionsFromHeadings(article as Element);
  }
}

/**
 * Get all top-level structure elements (those not nested within other structure elements)
 */
function getTopLevelStructureElements(container: HTMLElement): Element[] {
  // Collect all section, article, and aside elements
  const allStructuralElements = Array.from(container.querySelectorAll('section, article, aside'));
  
  // Filter to just the top-level ones (not nested inside other structural elements)
  return allStructuralElements.filter(element => {
    const parent = element.parentElement;
    if (!parent) return false;
    
    // Check if parent is the container or is not a section/article/aside
    const parentTag = parent.tagName.toLowerCase();
    const isParentStructural = parentTag === 'section' || parentTag === 'article' || parentTag === 'aside';
    
    return !isParentStructural || parent === container;
  });
}

/**
 * Create implicit sections based on headings when no explicit sections exist
 */
function createImplicitSectionsFromHeadings(container: Element): Section[] {
  // Find all headings that are direct children of the container
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(heading => {
    // Only include headings that are not inside other structural elements
    const closestStructural = heading.closest('section, article, aside');
    return !closestStructural || closestStructural === container;
  });
  
  logger.debug(`Found ${headings.length} headings for implicit sections`);
  
  // If no headings, create a single content section
  if (headings.length === 0) {
    return [createContentSection(container)];
  }
  
  // Create sections for each heading and its following content
  const sections: Section[] = [];
  
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = i < headings.length - 1 ? headings[i + 1] : null;
    
    // Create a section for this heading
    const section = createSectionFromHeading(heading, nextHeading, container);
    sections.push(section);
  }
  
  // Build hierarchical structure based on heading levels
  return buildHierarchyFromHeadingLevels(sections);
}

/**
 * Create a section from a heading and its following content
 */
function createSectionFromHeading(
  heading: Element, 
  nextHeading: Element | null, 
  container: Element
): Section {
  const title = heading.innerHTML; // Preserve HTML formatting in title
  const id = getElementId(heading, 'section');
  const level = getHeadingLevel(heading) || 1;
  
  // Find all content between this heading and the next
  const contentElements: Element[] = [];
  let current = heading.nextElementSibling;
  
  while (current && current !== nextHeading) {
    // Skip nested structural elements
    if (!['SECTION', 'ARTICLE', 'ASIDE'].includes(current.tagName)) {
      // Only include paragraph elements in content
      if (current.tagName === 'P') {
        contentElements.push(current);
      }
      // Handle special elements - tables, forms, etc.
      else if (current.tagName === 'TABLE') {
        // Special elements will be handled later
      }
    }
    
    current = current.nextElementSibling;
  }
  
  // Extract content with preserved HTML formatting
  const content = contentElements.map(el => el.innerHTML);
  
  // Create base section
  const section: Section = {
    type: 'section',
    id,
    title,
    level,
    content,
    children: []
  };
  
  // Process special elements
  processSpecialElements(section, heading, nextHeading, container);
  
  return section;
}

/**
 * Process special elements (tables, forms, figures) for a section
 */
function processSpecialElements(
  section: Section, 
  startElement: Element, 
  endElement: Element | null, 
  container: Element
): void {
  // Find all elements between start and end
  let current = startElement.nextElementSibling;
  
  while (current && current !== endElement) {
    const tagName = current.tagName.toLowerCase();
    
    // Process based on element type
    switch (tagName) {
      case 'table':
        section.table = processTable(current);
        break;
        
      case 'form':
        section.form = processForm(current);
        break;
        
      case 'figure':
        section.figure = processFigure(current);
        break;
    }
    
    current = current.nextElementSibling;
  }
}

/**
 * Create a single content section when no headings exist
 */
function createContentSection(container: Element): Section {
  const id = getElementId(container, 'content');
  
  // Get all paragraphs
  const paragraphs = Array.from(container.querySelectorAll('p'));
  const content = paragraphs.map(p => p.innerHTML); // Preserve HTML formatting
  
  return {
    type: 'section',
    id,
    content,
    children: []
  };
}

/**
 * Build hierarchical structure from heading levels
 */
function buildHierarchyFromHeadingLevels(sections: Section[]): Section[] {
  if (sections.length <= 1) return sections;
  
  // Sort by heading levels
  const sortedSections = [...sections].sort((a, b) => {
    const levelA = a.level || 1;
    const levelB = b.level || 1;
    return levelA - levelB;
  });
  
  // Find the minimum level - these will be our top sections
  const minLevel = Math.min(...sortedSections.map(s => s.level || 1));
  const topSections = sortedSections.filter(s => (s.level || 1) === minLevel);
  
  // Process each top section to add its children
  topSections.forEach(section => {
    buildSectionChildren(section, sortedSections);
  });
  
  return topSections;
}

/**
 * Build the children hierarchy for a section
 */
function buildSectionChildren(parent: Section, allSections: Section[]): void {
  const parentLevel = parent.level || 1;
  
  // Find child sections (those with level = parent level + 1)
  const childSections = allSections.filter(section => {
    const sectionLevel = section.level || 1;
    return sectionLevel === parentLevel + 1 && section !== parent;
  });
  
  // Skip if no children
  if (childSections.length === 0) return;
  
  // Determine which children belong to this parent (vs. other parents at same level)
  // This requires checking position in the document
  // For simplicity, we're just assigning all children of this level to this parent
  // In a real implementation, we'd check document position
  parent.children = childSections;
  
  // Recursively process child sections
  childSections.forEach(child => {
    buildSectionChildren(child, allSections);
  });
}

/**
 * Process standalone elements outside the main structure (blockquotes, search, footer)
 */
function processStandaloneElements(container: HTMLElement, result: Document): void {
  // Process blockquotes
  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach(blockquote => {
    // Skip nested blockquotes
    if (blockquote.closest('blockquote') !== blockquote) return;
    
    const quote = processQuote(blockquote);
    result.content.push({
      ...quote,
      type: 'quote',
      children: []
    });
  });
  
  // Process search elements
  const search = container.querySelector('search');
  if (search) {
    result.content.push({
      type: 'search',
      content: search.innerHTML,
      children: []
    });
  }
  
  // Process footer
  const footer = container.querySelector('footer');
  if (footer && footer.parentElement === container) {
    const footerContent = Array.from(footer.children).map(el => {
      // Special handling for links in footer
      if (el.tagName === 'A') {
        return el.textContent || '';
      }
      return el.innerHTML;
    });
    
    result.content.push({
      type: 'footer',
      content: footerContent,
      children: []
    });
  }
}
