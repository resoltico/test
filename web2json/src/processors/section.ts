// src/processors/section.ts
import * as cheerio from 'cheerio';
import { Section } from '../schema/section.js';
import { cleanHtmlContent, getHeadingLevel } from '../utils/html.js';

// Keeps track of heading information
interface HeadingInfo {
  level: number;
  element: cheerio.Element;
  text: string;
}

/**
 * Process a section including headings and content
 */
export function processSection($: cheerio.CheerioAPI, element: cheerio.Element): Section {
  const $element = $(element);
  
  // Determine section type based on element tag
  const type = element.tagName as any;
  
  const section: Section = {
    type,
    id: $element.attr('id'),
    content: []
  };
  
  // Find the first heading in this section to set the title and level
  const $heading = $element.find('h1, h2, h3, h4, h5, h6').first();
  if ($heading.length > 0) {
    section.title = cleanHtmlContent($heading.html() || $heading.text() || '');
    section.level = getHeadingLevel($heading.prop('tagName')) || undefined;
  }
  
  // Process section content (text nodes and elements that aren't sections or headings)
  const contentNodes = $element.contents().filter((_, el) => {
    // Skip section elements and heading elements 
    const isSection = el.type === 'tag' && ['section', 'article', 'aside'].includes(el.tagName);
    const isHeading = el.type === 'tag' && /^h[1-6]$/.test(el.tagName);
    
    // Keep text nodes and non-section elements
    return !isSection && !isHeading;
  });
  
  if (contentNodes.length > 0) {
    // Convert content nodes to HTML strings
    section.content = contentNodes.map((_, el) => {
      if (el.type === 'text') {
        const text = $(el).text().trim();
        return text.length > 0 ? text : null;
      }
      return cleanHtmlContent($(el).prop('outerHTML') || '');
    }).get().filter(Boolean) as string[];
    
    // If no content was found, remove the empty array
    if (section.content.length === 0) {
      delete section.content;
    }
  }
  
  // Process child sections
  const childSections = $element.children('section, article, aside')
    .map((_, el) => processSection($, el))
    .get();
  
  if (childSections.length > 0) {
    section.children = childSections;
  }
  
  return section;
}

/**
 * Process the entire document to create a hierarchical section structure
 */
export function processSections($: cheerio.CheerioAPI): Section[] {
  // First get all top-level sections
  const topSections = $('body > section, body > article, body > aside, body > div, main > section, main > article, main > aside')
    .map((_, el) => processSection($, el))
    .get();
  
  // If no explicit sections, create implicit sections from headings
  if (topSections.length === 0) {
    return createSectionsFromHeadings($);
  }
  
  return topSections;
}

/**
 * Create an implicit section structure from headings when no explicit sections exist
 */
export function createSectionsFromHeadings($: cheerio.CheerioAPI): Section[] {
  const headings: HeadingInfo[] = [];
  
  // Collect all headings
  $('body h1, body h2, body h3, body h4, body h5, body h6').each((_, el) => {
    const level = getHeadingLevel(el.tagName) || 0;
    headings.push({
      level,
      element: el,
      text: cleanHtmlContent($(el).html() || '')
    });
  });
  
  // If no headings, return a single implicit section with all content
  if (headings.length === 0) {
    return [{
      type: 'section',
      content: [$('body').html() || ''].filter(Boolean)
    }];
  }
  
  // Create sections from headings
  const sections: Section[] = [];
  const sectionStack: Section[] = [];
  
  headings.forEach((heading, index) => {
    const section: Section = {
      type: 'section',
      title: heading.text,
      level: heading.level,
      content: [],
      children: []
    };
    
    // Collect content between this heading and the next
    let contentEnd;
    if (index < headings.length - 1) {
      contentEnd = $(headings[index + 1].element);
    } else {
      contentEnd = $('body').children().last();
    }
    
    let content = '';
    let el = $(heading.element).next();
    while (el.length && !el.is(contentEnd.selector)) {
      // Skip headings and sections
      if (!el.is('h1, h2, h3, h4, h5, h6, section, article, aside')) {
        content += el.prop('outerHTML');
      }
      el = el.next();
    }
    
    if (content.trim()) {
      section.content = [cleanHtmlContent(content)];
    } else {
      delete section.content;
    }
    
    // Handle section hierarchy based on heading levels
    if (sectionStack.length === 0) {
      // First heading, push to root
      sections.push(section);
      sectionStack.push(section);
    } else {
      const currentLevel = heading.level;
      const lastSection = sectionStack[sectionStack.length - 1];
      const lastLevel = lastSection.level || 1;
      
      if (currentLevel > lastLevel) {
        // Child of previous section
        if (!lastSection.children) {
          lastSection.children = [];
        }
        lastSection.children.push(section);
        sectionStack.push(section);
      } else if (currentLevel === lastLevel) {
        // Sibling of previous section
        sectionStack.pop(); // Remove last section
        
        if (sectionStack.length === 0) {
          // Top level sibling
          sections.push(section);
        } else {
          // Add as sibling in parent's children
          const parent = sectionStack[sectionStack.length - 1];
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(section);
        }
        
        sectionStack.push(section);
      } else {
        // Current level is lower than previous (moving up the hierarchy)
        // Pop the stack until we find a level lower than or equal to current
        while (sectionStack.length > 0) {
          const topSection = sectionStack[sectionStack.length - 1];
          const topLevel = topSection.level || 1;
          
          if (topLevel >= currentLevel) {
            sectionStack.pop();
          } else {
            break;
          }
        }
        
        if (sectionStack.length === 0) {
          // Top level
          sections.push(section);
        } else {
          // Add as child to appropriate parent
          const parent = sectionStack[sectionStack.length - 1];
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(section);
        }
        
        sectionStack.push(section);
      }
    }
  });
  
  // Clean up empty children arrays
  const cleanSections = cleanEmptyChildren(sections);
  return cleanSections;
}

/**
 * Remove empty children arrays from the section hierarchy
 */
function cleanEmptyChildren(sections: Section[]): Section[] {
  return sections.map(section => {
    if (section.children && section.children.length === 0) {
      const { children, ...rest } = section;
      return rest;
    }
    
    if (section.children && section.children.length > 0) {
      return {
        ...section,
        children: cleanEmptyChildren(section.children)
      };
    }
    
    return section;
  });
}
