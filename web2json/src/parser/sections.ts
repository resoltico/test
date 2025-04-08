import { Section } from '../schema/section.js';
import { 
  getContentElements, 
  getContentUntilNextSibling,
  createContentSection
} from './content.js';
import { buildSectionHierarchy } from './hierarchy.js';
import { 
  normalizeHtmlContent,
  getIdFromElement
} from '../utils/html.js';
import {
  processTable,
  processForm,
  processFigure,
  processFormula
} from '../processors/index.js';
import { logger } from '../utils/logger.js';

// Define DOM Node constants since Node is not globally available in Node.js
const DOCUMENT_POSITION_FOLLOWING = 4; // Same as Node.DOCUMENT_POSITION_FOLLOWING in browsers

/**
 * Process an explicit section element
 */
export function processSection(sectionElement: Element): Section {
  const id = getIdFromElement(sectionElement, 'section');
  
  // Find the heading element
  const headings = Array.from(sectionElement.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let heading = headings.length > 0 ? headings[0] : null;
  
  // Get the heading level and title
  let level: number | undefined;
  let title: string | undefined;
  
  if (heading) {
    level = parseInt(heading.tagName.substring(1), 10);
    title = normalizeHtmlContent(heading.innerHTML);
  }
  
  // Extract content elements
  const contentElements = getContentElements(sectionElement, heading);
  const content = contentElements.map(el => normalizeHtmlContent(el.innerHTML));
  
  // Create section object
  const section: Section = {
    type: 'section',
    id,
    content,
    children: []
  };
  
  // Add optional properties
  if (title !== undefined) section.title = title;
  if (level !== undefined) section.level = level;
  
  // Process special elements
  processSpecialElements(section, sectionElement);
  
  // Process child sections
  const childSections = Array.from(sectionElement.querySelectorAll(':scope > section'));
  if (childSections.length > 0) {
    section.children = childSections.map(childSection => processSection(childSection));
  } else {
    // Check for implicit sections created by headings
    const nestedSections = createNestedSectionsFromHeadings(sectionElement, heading, level || 1);
    section.children = nestedSections;
  }
  
  return section;
}

/**
 * Process special elements within a section (tables, forms, figures, formulas)
 */
export function processSpecialElements(section: Section, container: Element): void {
  // Check for table
  const tableElement = container.querySelector(':scope > table');
  if (tableElement) {
    section.table = processTable(tableElement);
  }
  
  // Check for form
  const formElement = container.querySelector(':scope > form');
  if (formElement) {
    section.form = processForm(formElement);
  }
  
  // Check for figure
  const figureElement = container.querySelector(':scope > figure');
  if (figureElement) {
    section.figure = processFigure(figureElement);
  }
  
  // Check for formula elements
  processFormulaElements(section, container);
}

/**
 * Process potential formula elements (math, dl, pre, ol, ul)
 */
export function processFormulaElements(section: Section, container: Element): void {
  // Check for mathematical content
  const mathElement = container.querySelector(':scope > math');
  if (mathElement) {
    section.formula = processFormula(mathElement, 'math');
    return; // Just use one formula per section
  }
  
  // Check for definition list
  const dlElement = container.querySelector(':scope > dl');
  if (dlElement) {
    section.formula = processFormula(dlElement, 'dl');
    return;
  }
  
  // Check for code block
  const preElement = container.querySelector(':scope > pre');
  if (preElement) {
    section.formula = processFormula(preElement, 'pre');
    return;
  }
  
  // Check for ordered list
  const olElement = container.querySelector(':scope > ol');
  if (olElement) {
    section.formula = processFormula(olElement, 'ol');
    return;
  }
  
  // Check for unordered list
  const ulElement = container.querySelector(':scope > ul');
  if (ulElement) {
    section.formula = processFormula(ulElement, 'ul');
    return;
  }
}

/**
 * Process an article element
 */
export function processArticle(articleElement: Element): any {
  const id = getIdFromElement(articleElement, 'article');
  
  // Process child sections
  let children: Section[] = [];
  
  // Check for explicit sections first
  const childSections = Array.from(articleElement.querySelectorAll(':scope > section'));
  
  if (childSections.length > 0) {
    // Use explicit sections
    children = childSections.map(section => processSection(section));
  } else {
    // Create sections based on headings
    children = createSectionsFromHeadings(articleElement);
  }
  
  return {
    type: 'article',
    id,
    children
  };
}

/**
 * Process an aside element (similar to section but with type='aside')
 */
export function processAside(asideElement: Element): any {
  const section = processSection(asideElement);
  section.type = 'aside';
  return section;
}

/**
 * Create sections based on headings in a container
 */
export function createSectionsFromHeadings(container: Element): Section[] {
  // Find all headings
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  
  if (headings.length === 0) {
    // No headings - create a single content section
    return [createContentSection(container, getIdFromElement)];
  }
  
  // Sort headings by document position
  headings.sort((a, b) => {
    // Check if a comes before b in the document
    return (a.compareDocumentPosition(b) & DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });
  
  // Create sections for each heading
  const rawSections: Section[] = [];
  
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = i < headings.length - 1 ? headings[i + 1] : null;
    
    // Get heading level and title
    const level = parseInt(heading.tagName.substring(1), 10);
    const title = normalizeHtmlContent(heading.innerHTML);
    const id = getIdFromElement(heading, 'section');
    
    // Get content between this heading and the next
    const contentElements = getContentUntilNextSibling(heading, nextHeading, container);
    
    // Filter to only include paragraphs for content
    const paragraphs = contentElements.filter(el => el.tagName.toLowerCase() === 'p');
    const content = paragraphs.map(p => normalizeHtmlContent(p.innerHTML));
    
    // Create section
    const section: Section = {
      type: 'section',
      id,
      title,
      level,
      content,
      children: []
    };
    
    // Process special elements within the content
    for (const element of contentElements) {
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
        case 'dl':
          section.formula = processFormula(element, 'dl');
          break;
        case 'pre':
          section.formula = processFormula(element, 'pre');
          break;
        case 'ol':
          section.formula = processFormula(element, 'ol');
          break;
        case 'ul':
          section.formula = processFormula(element, 'ul');
          break;
        case 'math':
          section.formula = processFormula(element, 'math');
          break;
      }
    }
    
    rawSections.push(section);
  }
  
  // Convert flat array to hierarchical structure based on heading levels
  return buildSectionHierarchy(rawSections);
}

/**
 * Create nested sections from headings inside a section
 */
export function createNestedSectionsFromHeadings(
  container: Element, 
  parentHeading: Element | null, 
  parentLevel: number
): Section[] {
  // Find all headings that are children of the container
  // but not children of subsections
  const allHeadings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  
  // Filter out the parent heading and any heading with level <= parentLevel
  const childHeadings = allHeadings.filter(h => {
    if (h === parentHeading) return false;
    
    const level = parseInt(h.tagName.substring(1), 10);
    if (level <= parentLevel) return false;
    
    // Make sure it's not inside a subsection
    const parentSection = h.closest('section');
    if (parentSection && parentSection !== container) return false;
    
    return true;
  });
  
  if (childHeadings.length === 0) {
    return [];
  }
  
  // Sort headings by document position
  childHeadings.sort((a, b) => {
    return (a.compareDocumentPosition(b) & DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });
  
  // Create sections for each heading
  const rawSections: Section[] = [];
  
  for (let i = 0; i < childHeadings.length; i++) {
    const heading = childHeadings[i];
    const nextHeading = i < childHeadings.length - 1 ? childHeadings[i + 1] : null;
    
    // Get heading level and title
    const level = parseInt(heading.tagName.substring(1), 10);
    const title = normalizeHtmlContent(heading.innerHTML);
    const id = getIdFromElement(heading, 'section');
    
    // Get content between this heading and the next
    const contentElements = getContentUntilNextSibling(heading, nextHeading, container);
    
    // Filter to only include paragraphs for content
    const paragraphs = contentElements.filter(el => el.tagName.toLowerCase() === 'p');
    const content = paragraphs.map(p => normalizeHtmlContent(p.innerHTML));
    
    // Create section
    const section: Section = {
      type: 'section',
      id,
      title,
      level,
      content,
      children: []
    };
    
    // Process special elements within the content
    for (const element of contentElements) {
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
        case 'dl':
          section.formula = processFormula(element, 'dl');
          break;
        case 'pre':
          section.formula = processFormula(element, 'pre');
          break;
        case 'ol':
          section.formula = processFormula(element, 'ol');
          break;
        case 'ul':
          section.formula = processFormula(element, 'ul');
          break;
        case 'math':
          section.formula = processFormula(element, 'math');
          break;
      }
    }
    
    rawSections.push(section);
  }
  
  // Convert flat array to hierarchical structure
  return buildSectionHierarchy(rawSections);
}