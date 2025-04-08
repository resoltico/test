import { Section } from '../schema/section.js';
import { 
  isHeading,
  normalizeHtmlContent,
  getIdFromElement,
  getContentUntilNextSibling
} from '../utils/html.js';
import { processTable } from './table.js';
import { processForm } from './form.js';
import { processFigure } from './figure.js';
import { processFormula } from './formula.js';
import { logger } from '../utils/logger.js';

/**
 * Process a section element into structured JSON
 */
export function processSection(sectionElement: Element): Section {
  logger.debug(`Processing section: ${sectionElement.id || 'unnamed'}`);
  
  // Get section ID
  const id = getIdFromElement(sectionElement, 'section');
  
  // Find the heading element (first heading in the section)
  const headingElement = findSectionHeading(sectionElement);
  
  // Extract title and level from heading
  let title: string | undefined;
  let level: number | undefined;
  
  if (headingElement) {
    title = normalizeHtmlContent(headingElement.innerHTML);
    level = parseInt(headingElement.tagName.substring(1), 10);
  }
  
  // Extract content paragraphs (preserve HTML formatting)
  const paragraphs = extractParagraphs(sectionElement, headingElement);
  const content = paragraphs.map(el => normalizeHtmlContent(el.innerHTML));
  
  // Create the base section
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
  
  // Process child sections recursively
  const childSections = findChildSections(sectionElement);
  if (childSections.length > 0) {
    section.children = childSections.map(childElement => processSection(childElement));
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
 * Extract paragraph elements from a section
 */
function extractParagraphs(element: Element, headingElement: Element | null): Element[] {
  // Get all paragraphs that are direct children of the element
  const allParagraphs = element.querySelectorAll(':scope > p');
  
  if (!headingElement) {
    // If no heading, return all paragraphs
    return Array.from(allParagraphs);
  }
  
  // Otherwise, return paragraphs that come after the heading
  return Array.from(allParagraphs).filter(paragraph => {
    // Check if paragraph comes after the heading in the DOM
    let current = headingElement.nextSibling;
    while (current) {
      if (current === paragraph) {
        return true;
      }
      current = current.nextSibling;
    }
    return false;
  });
}

/**
 * Process special elements within a section (tables, forms, figures, formulas)
 */
function processSpecialElements(section: Section, element: Element): void {
  // Check for table (direct child)
  const tableElement = element.querySelector(':scope > table');
  if (tableElement) {
    section.table = processTable(tableElement);
  }
  
  // Check for form (direct child)
  const formElement = element.querySelector(':scope > form');
  if (formElement) {
    section.form = processForm(formElement);
  }
  
  // Check for figure (direct child)
  const figureElement = element.querySelector(':scope > figure');
  if (figureElement) {
    section.figure = processFigure(figureElement);
  }
  
  // Check for formula elements (direct children)
  // Check for mathematical content
  const mathElement = element.querySelector(':scope > math');
  if (mathElement) {
    section.formula = processFormula(mathElement, 'math');
    return; // Just use one formula per section
  }
  
  // Check for definition list
  const dlElement = element.querySelector(':scope > dl');
  if (dlElement) {
    section.formula = processFormula(dlElement, 'dl');
    return;
  }
  
  // Check for code block
  const preElement = element.querySelector(':scope > pre');
  if (preElement) {
    section.formula = processFormula(preElement, 'pre');
    return;
  }
  
  // Check for ordered list
  const olElement = element.querySelector(':scope > ol');
  if (olElement) {
    section.formula = processFormula(olElement, 'ol');
    return;
  }
  
  // Check for unordered list
  const ulElement = element.querySelector(':scope > ul');
  if (ulElement) {
    section.formula = processFormula(ulElement, 'ul');
    return;
  }
}

/**
 * Find direct child sections
 */
function findChildSections(element: Element): Element[] {
  // Select only direct child sections
  return Array.from(element.querySelectorAll(':scope > section'));
}

/**
 * Create a section for content with empty/default values for all required fields
 */
export function createSectionForContent(content: string[]): Section {
  return {
    type: 'section',
    id: `content-${Math.random().toString(36).substring(2, 9)}`,
    content,
    children: []
  };
}

/**
 * Build a hierarchical structure from a flat array of sections based on heading levels
 */
export function buildSectionHierarchy(sections: Section[]): Section[] {
  if (sections.length <= 1) return sections;
  
  // Make a copy to avoid modifying the original
  const sectionsCopy = JSON.parse(JSON.stringify(sections)) as Section[];
  
  // Find the minimum heading level
  const minLevel = Math.min(...sectionsCopy.map(s => s.level || Infinity).filter(l => l !== Infinity));
  
  // Group sections by their top-level parent
  const result: Section[] = [];
  let currentParent: Section | null = null;
  
  // First pass: identify top-level sections (those with minLevel)
  for (const section of sectionsCopy) {
    const level = section.level || Infinity;
    
    if (level === minLevel) {
      // This is a top-level section
      result.push(section);
      currentParent = section;
    } else if (currentParent) {
      // This is a child of the current parent
      currentParent.children.push(section);
    } else {
      // No parent yet, must be a top section
      result.push(section);
      currentParent = section;
    }
  }
  
  // Second pass: organize children recursively for each top-level section
  for (const topSection of result) {
    organizeChildren(topSection);
  }
  
  return result;
}

/**
 * Recursively organize children within a section based on their levels
 */
function organizeChildren(section: Section): void {
  if (!section.children || section.children.length <= 1) return;
  
  const children = [...section.children];
  section.children = [];
  
  // Sort children by level
  children.sort((a, b) => (a.level || Infinity) - (b.level || Infinity));
  
  // Find the minimum level among children
  const minChildLevel = Math.min(...children.map(c => c.level || Infinity));
  
  // First pass: identify direct children (those with minChildLevel)
  for (const child of children) {
    const level = child.level || Infinity;
    
    if (level === minChildLevel) {
      // This is a direct child
      section.children.push(child);
    } else {
      // This must be a grandchild or deeper - find its parent
      const parentLevel = findParentLevel(level, children);
      const parent = findLastSectionWithLevel(parentLevel, section.children);
      
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
      } else {
        // Fallback: add as direct child
        section.children.push(child);
      }
    }
  }
  
  // Recursively organize children for each child
  for (const child of section.children) {
    organizeChildren(child);
  }
}

/**
 * Find the appropriate parent level for a given child level
 */
function findParentLevel(childLevel: number, allSections: Section[]): number {
  // Find the highest level that's lower than childLevel
  const candidates = allSections
    .map(s => s.level || Infinity)
    .filter(level => level < childLevel);
  
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

/**
 * Find the last section with a specific level
 */
function findLastSectionWithLevel(level: number, sections: Section[]): Section | null {
  // Traverse the array in reverse to find the last matching section
  for (let i = sections.length - 1; i >= 0; i--) {
    if ((sections[i].level || Infinity) === level) {
      return sections[i];
    }
  }
  
  return null;
}