import { JSDOM } from 'jsdom';
import { Document } from './schema/document.js';
import { Section } from './schema/section.js';
import { logger } from './utils/logger.js';
import { 
  extractFormattedContent, 
  getDocumentTitle, 
  getElementId, 
  getHeadingLevel, 
  isHeading,
  getSectionTitle,
  normalizeHtmlContent,
  elementToHtml
} from './utils/html.js';
import { 
  processSection,
  processTable,
  processForm,
  processFigure,
  processQuote,
  processSearch,
  processHeaderFooter
} from './processors/index.js';

// Define DOM Node constants since Node is not globally available in Node.js
const DOCUMENT_POSITION_FOLLOWING = 4; // Same as Node.DOCUMENT_POSITION_FOLLOWING in browsers
const DOCUMENT_POSITION_PRECEDING = 2; // Same as Node.DOCUMENT_POSITION_PRECEDING in browsers

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
  
  // Process the main content
  const body = document.body;
  
  if (!body) {
    logger.warning('Document body not found');
    return result;
  }
  
  // Process top-level elements in the body
  const childElements = Array.from(body.children);
  
  // Process the document structure based on top-level elements
  processTopLevelElements(childElements, result);
  
  logger.success('Document parsing complete');
  return result;
}

/**
 * Process top-level elements in the document body
 */
function processTopLevelElements(elements: Element[], result: Document): void {
  logger.info(`Processing ${elements.length} top-level elements`);
  
  // First, identify and process structural elements (header, main, sections, articles)
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    
    // Process main container elements
    if (['header', 'main', 'section', 'article', 'aside'].includes(tagName)) {
      processStructuralElement(element, result);
    }
  }
  
  // Process non-structural elements that didn't get captured
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    
    // Skip elements already processed as structural
    if (['header', 'main', 'section', 'article', 'aside'].includes(tagName)) {
      continue;
    }
    
    // Process other significant elements
    processNonStructuralElement(element, result);
  }
}

/**
 * Process structural elements like sections, articles, main, etc.
 */
function processStructuralElement(element: Element, result: Document): void {
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'header':
      // Process header content if needed
      const headerContent = processHeaderFooter(element, 'header');
      if (headerContent) {
        result.content.push(headerContent);
      }
      break;
    
    case 'main':
      // Process all children of main as if they were top-level
      processTopLevelElements(Array.from(element.children), result);
      break;
      
    case 'section':
      // Process as section
      const section = processSection(element);
      result.content.push(section);
      break;
      
    case 'article':
      // Process as article with sections
      const articleId = getElementId(element, 'article');
      const articleSections = processArticleContent(element);
      
      result.content.push({
        type: 'article',
        id: articleId,
        children: articleSections
      });
      break;
      
    case 'aside':
      // Process as a section with aside type
      const asideSection = processSection(element);
      if (asideSection.type === 'section') {
        asideSection.type = 'aside';
      }
      result.content.push(asideSection);
      break;
  }
}

/**
 * Process non-structural elements like blockquotes, forms, tables, etc.
 */
function processNonStructuralElement(element: Element, result: Document): void {
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'blockquote':
      const quote = processQuote(element);
      result.content.push({
        ...quote,
        type: 'quote',
        children: []
      });
      break;
      
    case 'search':
      const search = processSearch(element);
      result.content.push(search);
      break;
      
    case 'form':
      // Create a section to contain the form
      const formSection = createSectionWithForm(element);
      result.content.push(formSection);
      break;
      
    case 'table':
      // Create a section to contain the table
      const tableSection = createSectionWithTable(element);
      result.content.push(tableSection);
      break;
      
    case 'footer':
      // Process footer
      const footerContent = processHeaderFooter(element, 'footer');
      if (footerContent) {
        result.content.push(footerContent);
      }
      break;
      
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      // Create an implicit section for standalone headings
      const implicitSection = createImplicitSection(element);
      result.content.push(implicitSection);
      break;
      
    case 'div':
      // Process div content if it contains significant elements
      processDivContent(element, result);
      break;
      
    case 'p':
    case 'ul':
    case 'ol':
    case 'dl':
    case 'pre':
    case 'figure':
      // Create a section for standalone content elements
      const contentSection = createSectionForContentElement(element);
      result.content.push(contentSection);
      break;
  }
}

/**
 * Process an article element to extract sections
 */
function processArticleContent(article: Element): Section[] {
  // First look for explicit sections
  const explicitSections = Array.from(article.querySelectorAll(':scope > section'));
  
  if (explicitSections.length > 0) {
    // Process explicit sections
    return explicitSections.map(section => processSection(section));
  }
  
  // If no explicit sections, create sections based on headings
  return createSectionsFromHeadings(article);
}

/**
 * Create sections based on heading elements
 */
function createSectionsFromHeadings(container: Element): Section[] {
  // Find all headings
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  
  if (headings.length === 0) {
    // No headings, create a single section with all content
    return [createSectionWithAllContent(container)];
  }
  
  // Sort headings by document position
  headings.sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    return (position & DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });
  
  // Create sections for each heading
  const sections: Section[] = [];
  
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = i < headings.length - 1 ? headings[i + 1] : null;
    
    // Create section
    const section = createSectionFromHeading(heading, nextHeading, container);
    sections.push(section);
  }
  
  // Build proper hierarchy based on heading levels
  return buildSectionHierarchy(sections);
}

/**
 * Create a section from a heading element and content up to the next heading
 */
function createSectionFromHeading(
  heading: Element, 
  nextHeading: Element | null, 
  container: Element
): Section {
  const title = normalizeHtmlContent(heading.innerHTML);
  const id = getElementId(heading, 'section');
  const level = getHeadingLevel(heading) || 1;
  
  // Find content between this heading and the next
  const contentElements: Element[] = [];
  let current = heading.nextElementSibling;
  
  while (current && (!nextHeading || !current.isSameNode(nextHeading))) {
    // Skip elements that would be processed separately
    if (!isHeading(current) && 
        !['SECTION', 'ARTICLE', 'ASIDE'].includes(current.tagName)) {
      contentElements.push(current);
    }
    
    current = current.nextElementSibling;
  }
  
  // Extract content with preserved HTML formatting
  const content = contentElements
    .filter(el => el.tagName === 'P')
    .map(el => normalizeHtmlContent(el.innerHTML));
  
  // Create section
  const section: Section = {
    type: 'section',
    id,
    title,
    level,
    content,
    children: []
  };
  
  // Process special elements
  processSpecialElements(section, contentElements);
  
  return section;
}

/**
 * Process special elements (tables, forms, figures, etc.) in a section
 */
function processSpecialElements(section: Section, elements: Element[]): void {
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'table':
        section.table = processTable(element);
        break;
        
      case 'form':
        section.form = processForm(element);
        break;
        
      case 'figure':
        section.figure = processFigure(element);
        break;
        
      // Add other special element types as needed
    }
  }
}

/**
 * Create a section containing all content from an element
 */
function createSectionWithAllContent(container: Element): Section {
  const id = getElementId(container, 'content');
  const contentElements = Array.from(container.querySelectorAll('p'));
  
  // Extract content with preserved HTML formatting
  const content = contentElements.map(el => normalizeHtmlContent(el.innerHTML));
  
  // Create section
  const section: Section = {
    type: 'section',
    id,
    content,
    children: []
  };
  
  // Process special elements
  const specialElements = Array.from(container.querySelectorAll('table, form, figure'));
  processSpecialElements(section, specialElements);
  
  return section;
}

/**
 * Build a hierarchical structure of sections based on heading levels
 */
function buildSectionHierarchy(sections: Section[]): Section[] {
  if (sections.length <= 1) return sections;
  
  // Clone sections to avoid modifying the originals during hierarchy building
  const sectionsCopy = JSON.parse(JSON.stringify(sections)) as Section[];
  
  // Find the minimum heading level - these will be our top-level sections
  const minLevel = Math.min(...sectionsCopy.map(s => s.level || Infinity).filter(l => l !== Infinity));
  
  // Identify top-level sections
  const topSections = sectionsCopy.filter(s => (s.level || Infinity) === minLevel);
  
  // Process each top section
  topSections.forEach((section, index) => {
    // Find the next top section (if any)
    const nextTopIndex = sectionsCopy.findIndex((s, i) => 
      i > index && (s.level || Infinity) === minLevel
    );
    
    // Get all sections between this top section and the next
    const endIndex = nextTopIndex !== -1 ? nextTopIndex : sectionsCopy.length;
    const subSections = sectionsCopy.slice(index + 1, endIndex)
      .filter(s => (s.level || Infinity) > minLevel);
    
    // Recursively build the hierarchy for these subsections
    if (subSections.length > 0) {
      section.children = buildSectionHierarchy(subSections);
    }
  });
  
  return topSections;
}

/**
 * Create a section containing a form
 */
function createSectionWithForm(formElement: Element): Section {
  const id = getElementId(formElement, 'form-section');
  const nearestHeading = findNearestHeading(formElement);
  
  // Create section
  const section: Section = {
    type: 'section',
    id,
    content: [],
    children: []
  };
  
  // Add title if available
  if (nearestHeading) {
    section.title = normalizeHtmlContent(nearestHeading.innerHTML);
    section.level = getHeadingLevel(nearestHeading) || 2;
  }
  
  // Add form
  section.form = processForm(formElement);
  
  return section;
}

/**
 * Create a section containing a table
 */
function createSectionWithTable(tableElement: Element): Section {
  const id = getElementId(tableElement, 'table-section');
  const nearestHeading = findNearestHeading(tableElement);
  
  // Create section
  const section: Section = {
    type: 'section',
    id,
    content: [],
    children: []
  };
  
  // Add title if available
  if (nearestHeading) {
    section.title = normalizeHtmlContent(nearestHeading.innerHTML);
    section.level = getHeadingLevel(nearestHeading) || 2;
  }
  
  // Add table
  section.table = processTable(tableElement);
  
  return section;
}

/**
 * Find the nearest heading element preceding the given element
 */
function findNearestHeading(element: Element): Element | null {
  let current = element.previousElementSibling;
  
  while (current) {
    if (isHeading(current)) {
      return current;
    }
    current = current.previousElementSibling;
  }
  
  // If no heading found as sibling, look for a heading in a common parent
  const parent = element.parentElement;
  if (parent) {
    const parentHeadings = Array.from(parent.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    // Find headings that come before this element
    for (const heading of parentHeadings) {
      if (heading.compareDocumentPosition(element) & DOCUMENT_POSITION_FOLLOWING) {
        return heading;
      }
    }
  }
  
  return null;
}

/**
 * Create an implicit section for a standalone heading
 */
function createImplicitSection(headingElement: Element): Section {
  const id = getElementId(headingElement, 'heading-section');
  const level = getHeadingLevel(headingElement) || 1;
  const title = normalizeHtmlContent(headingElement.innerHTML);
  
  // Find content after this heading
  const contentElements: Element[] = [];
  let current = headingElement.nextElementSibling;
  
  while (current && !isHeading(current) && 
         !['SECTION', 'ARTICLE', 'ASIDE'].includes(current.tagName)) {
    contentElements.push(current);
    current = current.nextElementSibling;
  }
  
  // Extract content with preserved HTML formatting
  const content = contentElements
    .filter(el => el.tagName === 'P')
    .map(el => normalizeHtmlContent(el.innerHTML));
  
  // Create section
  const section: Section = {
    type: 'section',
    id,
    title,
    level,
    content,
    children: []
  };
  
  // Process special elements
  processSpecialElements(section, contentElements);
  
  return section;
}

/**
 * Process div content if it contains significant elements
 */
function processDivContent(divElement: Element, result: Document): void {
  // Check if this div contains significant elements
  const hasHeadings = divElement.querySelector('h1, h2, h3, h4, h5, h6');
  const hasSpecialElements = divElement.querySelector('table, form, figure');
  
  if (hasHeadings || hasSpecialElements) {
    // Process as if it's a container
    const childElements = Array.from(divElement.children);
    processTopLevelElements(childElements, result);
  } else {
    // Check for paragraphs or other content
    const paragraphs = divElement.querySelectorAll('p');
    
    if (paragraphs.length > 0) {
      // Create a content section
      const section = createSectionWithAllContent(divElement);
      result.content.push(section);
    }
  }
}

/**
 * Create a section for a standalone content element (p, ul, ol, etc.)
 */
function createSectionForContentElement(element: Element): Section {
  const id = getElementId(element, 'content-section');
  
  // Create section
  const section: Section = {
    type: 'section',
    id,
    content: [],
    children: []
  };
  
  // Handle different element types
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'p') {
    // Add paragraph content
    section.content = [normalizeHtmlContent(element.innerHTML)];
  } else if (['ul', 'ol'].includes(tagName)) {
    // Process list as special content
    section.content = []; // Keep content empty
    const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
    
    if (tagName === 'ul') {
      section.formula = {
        description: 'Unordered list',
        terms: [],
        'unordered-list': listItems
      };
    } else {
      section.formula = {
        description: 'Ordered list',
        terms: [],
        'ordered-list': listItems
      };
    }
  } else if (tagName === 'dl') {
    // Process definition list
    section.content = []; // Keep content empty
    const terms: { term: string; definition: string }[] = [];
    
    const dtElements = element.querySelectorAll('dt');
    for (const dt of Array.from(dtElements)) {
      const term = dt.textContent || '';
      let definition = '';
      
      // Find corresponding dd
      const dd = dt.nextElementSibling;
      if (dd && dd.tagName.toLowerCase() === 'dd') {
        definition = dd.textContent || '';
      }
      
      terms.push({ term, definition });
    }
    
    section.formula = {
      description: 'Definition list',
      terms
    };
  } else if (tagName === 'pre') {
    // Process code block
    section.content = []; // Keep content empty
    const code = element.textContent || '';
    
    section.formula = {
      description: 'Code block',
      terms: [],
      code
    };
  } else if (tagName === 'figure') {
    // Process figure
    section.figure = processFigure(element);
  }
  
  return section;
}
