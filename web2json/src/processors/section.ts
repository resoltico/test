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

/**
 * Process a section element and its children
 */
export function processSection(element: Element): Section {
  // Extract section ID
  const id = getElementId(element);
  
  // Get the heading element (first heading within this section)
  const headingElement = Array.from(element.children).find(isHeading);
  
  // Extract heading text and level
  let title: string | undefined;
  let level: number | undefined;
  
  if (headingElement) {
    title = extractFormattedContent(headingElement);
    level = getHeadingLevel(headingElement) || undefined;
  }
  
  // Extract content paragraphs (text elements that aren't headings or special elements)
  const contentElements = Array.from(element.children).filter(child => {
    const tagName = child.tagName.toLowerCase();
    return tagName === 'p' && !isHeading(child);
  });
  
  const content = contentElements.map(extractFormattedContent);
  
  // Create the base section object
  const section: Section = {
    type: 'section',
    id,
    content,
    children: []
  };
  
  // Add optional properties if they exist
  if (title) section.title = title;
  if (level) section.level = level;
  
  // Process special elements
  
  // Check for table
  const tableElement = element.querySelector('table');
  if (tableElement) {
    section.table = processTable(tableElement);
  }
  
  // Check for form
  const formElement = element.querySelector('form');
  if (formElement) {
    section.form = processForm(formElement);
  }
  
  // Check for figure
  const figureElement = element.querySelector('figure');
  if (figureElement) {
    section.figure = processFigure(figureElement);
  }
  
  // Check for mathematical content or other special content
  const specialElements = ['math', 'dl', 'pre', 'ol', 'ul'];
  for (const tagName of specialElements) {
    const specialElement = element.querySelector(tagName);
    if (specialElement) {
      const specialContent = processSpecialContent(specialElement);
      if (specialContent) {
        // Ensure the specialContent matches the formula schema structure with required properties
        section.formula = {
          description: specialContent.description,
          terms: specialContent.terms || [], // Provide empty array as fallback
          code: specialContent.code,
          'ordered-list': specialContent['ordered-list'],
          'unordered-list': specialContent['unordered-list']
        };
        break;
      }
    }
  }
  
  // Process child sections
  const childSections = Array.from(element.children).filter(child => {
    return child.tagName.toLowerCase() === 'section';
  });
  
  section.children = childSections.map(processSection);
  
  return section;
}

/**
 * Create a hierarchical section structure from flat sections based on heading levels
 */
export function buildSectionHierarchy(sections: Section[]): Section[] {
  if (sections.length === 0) return [];
  
  // Sort sections by their level (if defined)
  const sortedSections = [...sections].sort((a, b) => {
    const levelA = a.level || 1;
    const levelB = b.level || 1;
    return levelA - levelB;
  });
  
  // Find the minimum heading level to establish the root level
  const minLevel = Math.min(...sortedSections.map(s => s.level || 1));
  
  // Filter root sections (those at the minimum level)
  const rootSections = sortedSections.filter(s => (s.level || 1) === minLevel);
  
  // Process each root section to build its hierarchy
  rootSections.forEach(section => {
    buildChildHierarchy(section, sortedSections);
  });
  
  return rootSections;
}

/**
 * Recursively build the hierarchy for a section by finding its children
 */
function buildChildHierarchy(parent: Section, allSections: Section[]): void {
  const parentLevel = parent.level || 1;
  
  // Gather potential children (sections with level = parent level + 1)
  const childSections = allSections.filter(s => {
    return (s.level || 1) === parentLevel + 1 && 
           s !== parent && 
           !parent.children.includes(s);
  });
  
  // If no children, return
  if (childSections.length === 0) return;
  
  // Add children to parent
  parent.children = parent.children.concat(childSections);
  
  // Recursively process each child
  childSections.forEach(child => {
    buildChildHierarchy(child, allSections);
  });
}
