import { Section } from '../schema/section.js';
import { 
  extractFormattedContent, 
  getElementId, 
  getHeadingLevel, 
  isHeading 
} from '../utils/html.js';
import { processTable } from './table.js';
import { processForm } from './form.js';
import { processFigure } from './figure.js';
import { processSpecialContent } from './special.js';
import { logger } from '../utils/logger.js';

// DOM node relationship constants (since Node isn't globally available in Node.js)
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
    title = headingElement.innerHTML; // Preserve HTML formatting
    // Convert null to undefined if getHeadingLevel returns null
    level = getHeadingLevel(headingElement) ?? undefined;
  }
  
  // Extract content paragraphs (preserve HTML formatting)
  const contentElements = extractContentElements(element, headingElement);
  const content = contentElements.map(el => el.innerHTML);
  
  // Create the base section
  const section: Section = {
    type: 'section',
    id,
    content,
    children: []
  };
  
  // Add optional properties
  if (title) section.title = title;
  if (level) section.level = level;
  
  // Process special elements
  addSpecialElements(section, element);
  
  // Process child sections
  addChildSections(section, element);
  
  return section;
}

/**
 * Find the first heading element within a section
 */
function findSectionHeading(element: Element): Element | null {
  // First check direct children
  for (const child of Array.from(element.children)) {
    if (isHeading(child)) {
      return child;
    }
  }
  
  // If no direct child heading, look deeper
  return element.querySelector('h1, h2, h3, h4, h5, h6');
}

/**
 * Extract content elements (paragraphs) from a section
 */
function extractContentElements(element: Element, headingElement: Element | null): Element[] {
  const result: Element[] = [];
  
  // Collect all paragraph elements that are not inside child sections
  const paragraphs = element.querySelectorAll('p');
  
  for (const paragraph of Array.from(paragraphs)) {
    // Skip if this paragraph is inside a nested section
    const closestSection = paragraph.closest('section');
    if (closestSection && closestSection !== element) {
      continue;
    }
    
    // Skip if this paragraph is before the heading
    if (headingElement && 
        (headingElement.compareDocumentPosition(paragraph) & DOCUMENT_POSITION_PRECEDING)) {
      continue;
    }
    
    result.push(paragraph);
  }
  
  return result;
}

/**
 * Process special elements within a section (tables, forms, figures)
 */
function addSpecialElements(section: Section, element: Element): void {
  // Check for table
  const tableElement = element.querySelector('table');
  if (tableElement && !isInNestedSection(tableElement, element)) {
    section.table = processTable(tableElement);
  }
  
  // Check for form
  const formElement = element.querySelector('form');
  if (formElement && !isInNestedSection(formElement, element)) {
    section.form = processForm(formElement);
  }
  
  // Check for figure
  const figureElement = element.querySelector('figure');
  if (figureElement && !isInNestedSection(figureElement, element)) {
    section.figure = processFigure(figureElement);
  }
  
  // Check for special content (math, definition lists, code, etc.)
  const specialElementTypes = ['math', 'dl', 'pre', 'ol', 'ul'];
  
  for (const type of specialElementTypes) {
    const specialElement = element.querySelector(type);
    
    if (specialElement && !isInNestedSection(specialElement, element)) {
      const specialContent = processSpecialContent(specialElement);
      
      if (specialContent) {
        section.formula = {
          description: specialContent.description,
          terms: specialContent.terms || [],
          code: specialContent.code,
          'ordered-list': specialContent['ordered-list'],
          'unordered-list': specialContent['unordered-list']
        };
        
        // Break after finding the first special content to avoid overwrites
        break;
      }
    }
  }
}

/**
 * Check if an element is within a nested section
 */
function isInNestedSection(element: Element, parentSection: Element): boolean {
  const closestSection = element.closest('section');
  return closestSection !== null && closestSection !== parentSection;
}

/**
 * Process child sections
 */
function addChildSections(section: Section, element: Element): void {
  // Find direct child section elements
  const childSections = Array.from(element.querySelectorAll(':scope > section'));
  
  if (childSections.length > 0) {
    section.children = childSections.map(processSection);
  }
}
