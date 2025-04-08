import { Section } from '../schema/section.js';
import { 
  extractFormattedContent, 
  getElementId, 
  getHeadingLevel, 
  isHeading,
  normalizeHtmlContent,
  getSectionTitle,
  elementToHtml,
  getContentUntilNextHeadingOrSection
} from '../utils/html.js';
import { processTable } from './table.js';
import { processForm } from './form.js';
import { processFigure } from './figure.js';
import { processSpecialContent } from './special.js';
import { logger } from '../utils/logger.js';

// Define DOM Node constants since Node is not globally available in Node.js
const DOCUMENT_POSITION_FOLLOWING = 4; // Same as Node.DOCUMENT_POSITION_FOLLOWING in browsers
const DOCUMENT_POSITION_PRECEDING = 2; // Same as Node.DOCUMENT_POSITION_PRECEDING in browsers

/**
 * Process a section element into the desired JSON structure
 */
export function processSection(element: Element): Section {
  logger.debug(`Processing section: ${element.id || 'unnamed'}`);
  
  // Get section ID
  const id = getElementId(element, 'section');
  
  // Find the heading element (first heading in the section)
  const headingElement = findSectionHeading(element);
  
  // Extract title and level from heading
  let title: string | undefined;
  let level: number | undefined;
  
  if (headingElement) {
    title = normalizeHtmlContent(headingElement.innerHTML);
    // Convert null to undefined if getHeadingLevel returns null
    level = getHeadingLevel(headingElement) ?? undefined;
  }
  
  // Extract content paragraphs (preserve HTML formatting)
  const contentElements = extractContentElements(element, headingElement);
  const content = contentElements.map(el => normalizeHtmlContent(el.innerHTML));
  
  // Create the base section
  const section: Section = {
    type: 'section',
    id,
    content: content || [], // Ensure content is at least an empty array
    children: []
  };
  
  // Add optional properties
  if (title) section.title = title;
  if (level) section.level = level;
  
  // Process special elements
  processSpecialElements(section, element);
  
  // Process child sections recursively
  const childSections = findChildSections(element);
  if (childSections.length > 0) {
    section.children = childSections.map(childElement => processSection(childElement));
  } else {
    // Ensure children is at least an empty array
    section.children = [];
  }
  
  return section;
}

/**
 * Find the first heading element within a section
 */
function findSectionHeading(element: Element): Element | null {
  // First check direct children for headings in order h1 through h6
  for (let i = 1; i <= 6; i++) {
    const directHeadings = element.querySelectorAll(`:scope > h${i}`);
    if (directHeadings.length > 0) {
      return directHeadings[0];
    }
  }
  
  // If no direct child heading, look for the first heading at any level
  for (let i = 1; i <= 6; i++) {
    const heading = element.querySelector(`h${i}`);
    if (heading) {
      return heading;
    }
  }
  
  return null;
}

/**
 * Extract content elements (paragraphs) from a section
 */
function extractContentElements(element: Element, headingElement: Element | null): Element[] {
  const result: Element[] = [];
  const allParagraphs = element.querySelectorAll('p');
  
  for (const paragraph of Array.from(allParagraphs)) {
    // Skip paragraphs in nested sections or other containers
    if (paragraph.closest('section, article, aside') !== element) {
      continue;
    }
    
    // Skip paragraphs that appear before the heading
    if (headingElement && 
        (headingElement.compareDocumentPosition(paragraph) & DOCUMENT_POSITION_FOLLOWING)) {
      result.push(paragraph);
    } else if (!headingElement) {
      // If no heading, include all paragraphs
      result.push(paragraph);
    }
  }
  
  return result;
}

/**
 * Process special elements within a section (tables, forms, figures)
 */
function processSpecialElements(section: Section, element: Element): void {
  // Check for table (direct child or nested but not in a child section)
  const tables = element.querySelectorAll('table');
  for (const table of Array.from(tables)) {
    // Skip tables in nested sections
    if (table.closest('section, article, aside') !== element) {
      continue;
    }
    
    // Only process the first table found
    section.table = processTable(table);
    break;
  }
  
  // Check for form
  const forms = element.querySelectorAll('form');
  for (const form of Array.from(forms)) {
    // Skip forms in nested sections
    if (form.closest('section, article, aside') !== element) {
      continue;
    }
    
    // Only process the first form found
    section.form = processForm(form);
    break;
  }
  
  // Check for figure
  const figures = element.querySelectorAll('figure');
  for (const figure of Array.from(figures)) {
    // Skip figures in nested sections
    if (figure.closest('section, article, aside') !== element) {
      continue;
    }
    
    // Only process the first figure found
    section.figure = processFigure(figure);
    break;
  }
  
  // Check for other special content (math, lists, etc.)
  processOtherSpecialContent(section, element);
}

/**
 * Process other special content types (math, lists, etc.)
 */
function processOtherSpecialContent(section: Section, element: Element): void {
  // Check for various special content types
  const specialElementTypes = ['math', 'dl', 'pre', 'ol', 'ul'];
  
  for (const type of specialElementTypes) {
    const elements = element.querySelectorAll(type);
    
    for (const specialElement of Array.from(elements)) {
      // Skip elements in nested sections
      if (specialElement.closest('section, article, aside') !== element) {
        continue;
      }
      
      // Process the first special element found
      const specialContent = processSpecialContent(specialElement);
      
      if (specialContent) {
        section.formula = specialContent;
        return; // Stop after finding first special content
      }
    }
  }
}

/**
 * Find direct child sections (avoiding nested sections within child sections)
 */
function findChildSections(element: Element): Element[] {
  // Select only direct child sections
  return Array.from(element.querySelectorAll(':scope > section'));
}

/**
 * Create a section for a content element with empty/default values for all required fields
 */
export function createSectionForContent(content: string[]): Section {
  return {
    type: 'section',
    id: `content-${Math.random().toString(36).substring(2, 9)}`,
    content: content || [],
    children: []
  };
}

/**
 * Validate and fix a section object, ensuring all required properties are present
 */
export function validateSection(section: Section): Section {
  // Ensure all required arrays are present
  if (!Array.isArray(section.content)) {
    section.content = [];
  }
  
  if (!Array.isArray(section.children)) {
    section.children = [];
  }
  
  // Ensure all children are valid - added explicit type annotation for 'child'
  section.children = section.children.map((child: Section) => validateSection(child));
  
  // Validate formula if present
  if (section.formula && !Array.isArray(section.formula.terms)) {
    section.formula.terms = [];
  }
  
  return section;
}
