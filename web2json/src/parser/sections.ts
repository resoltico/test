import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import sanitizeHtml from 'sanitize-html';
import { SectionSchema } from '../models/section.js';
import { 
  processTable,
  processForm,
  processFigure,
  processQuote,
  processAside
} from './elements/index.js';
import { logger } from '../utils/logger.js';

interface HeadingNode {
  element: cheerio.Element;
  level: number;
  title: string;
  id?: string;
}

export function buildSectionHierarchy($: cheerio.CheerioAPI, $body: cheerio.Cheerio<cheerio.Element>): SectionSchema[] {
  // Step 1: Find all headings to establish structure
  const headings: HeadingNode[] = [];
  
  $body.find('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    const level = parseInt(heading.tagName.substring(1), 10);
    const title = $(heading).text().trim();
    const id = $(heading).attr('id');
    
    headings.push({
      element: heading,
      level,
      title,
      id
    });
  });
  
  // Step 2: Create sections based on headings
  const sections: SectionSchema[] = [];
  const sectionStack: SectionSchema[] = [];
  
  // Initialize with a root section if no headings
  if (headings.length === 0) {
    const rootSection: SectionSchema = {
      type: 'section',
      id: 'content',
      title: 'Content',
      level: 1,
      content: []
    };
    sections.push(rootSection);
    sectionStack.push(rootSection);
  }
  
  // Process each heading and create sections
  headings.forEach((heading, index) => {
    const currentSection: SectionSchema = {
      type: 'section',
      id: heading.id,
      title: decode(heading.title),
      level: heading.level,
      content: [],
      children: []
    };
    
    // Determine the parent section based on heading level
    while (
      sectionStack.length > 0 && 
      sectionStack[sectionStack.length - 1].level >= heading.level
    ) {
      sectionStack.pop();
    }
    
    if (sectionStack.length === 0) {
      // This is a top-level section
      sections.push(currentSection);
    } else {
      // Add as a child to the parent section
      const parentSection = sectionStack[sectionStack.length - 1];
      if (!parentSection.children) {
        parentSection.children = [];
      }
      parentSection.children.push(currentSection);
    }
    
    sectionStack.push(currentSection);
    
    // Find content between this heading and the next one
    let $contentElements;
    if (index < headings.length - 1) {
      const nextHeading = headings[index + 1];
      $contentElements = $(heading).nextUntil(nextHeading.element);
    } else {
      $contentElements = $(heading).nextAll();
    }
    
    // Process content for this section
    processContentElements($, currentSection, $contentElements);
  });
  
  // If no headings were found, process all body content
  if (headings.length === 0 && sections.length > 0) {
    processContentElements($, sections[0], $body.children());
  }
  
  logger.debug(`Built section hierarchy with ${sections.length} top-level sections`);
  return sections;
}

function processContentElements(
  $: cheerio.CheerioAPI, 
  section: SectionSchema, 
  $elements: cheerio.Cheerio<cheerio.Element>
): void {
  if (!section.content) {
    section.content = [];
  }
  
  $elements.each((_, element) => {
    const $element = $(element);
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'p':
        // Process paragraph text content
        const paragraphText = sanitizeContentString($element.html() || '');
        if (paragraphText.trim()) {
          section.content!.push(paragraphText);
        }
        break;
        
      case 'table':
        // Process table
        section.table = processTable($element);
        break;
        
      case 'form':
        // Process form
        section.form = processForm($element);
        break;
        
      case 'figure':
        // Process figure
        section.figure = processFigure($element);
        break;
        
      case 'blockquote':
        // Process quote
        section.quote = processQuote($element);
        break;
        
      case 'aside':
        // Process aside
        if (!section.children) {
          section.children = [];
        }
        
        const asideSection: SectionSchema = {
          type: 'aside',
          content: [],
          children: []
        };
        
        const aside = processAside($element);
        if (aside.title) {
          asideSection.title = aside.title;
        }
        asideSection.content = aside.content;
        
        section.children.push(asideSection);
        break;
        
      case 'div':
        // Process div as a container, look for content inside
        processContentElements($, section, $element.children());
        break;
        
      case 'article':
        // Process article as a section
        if (!section.children) {
          section.children = [];
        }
        
        const articleSection: SectionSchema = {
          type: 'article',
          content: [],
          children: []
        };
        
        // Find article title from first heading if present
        const $articleHeading = $element.find('h1, h2, h3, h4, h5, h6').first();
        if ($articleHeading.length) {
          articleSection.title = $articleHeading.text().trim();
          $articleHeading.remove(); // Remove to avoid processing twice
        }
        
        // Process remaining content
        processContentElements($, articleSection, $element.children());
        
        section.children.push(articleSection);
        break;
        
      case 'section':
        // Process section as a sub-section
        if (!section.children) {
          section.children = [];
        }
        
        const subSection: SectionSchema = {
          type: 'section',
          content: [],
          children: []
        };
        
        // Find section title from first heading if present
        const $sectionHeading = $element.find('h1, h2, h3, h4, h5, h6').first();
        if ($sectionHeading.length) {
          subSection.title = $sectionHeading.text().trim();
          $sectionHeading.remove(); // Remove to avoid processing twice
        }
        
        // Get section ID if present
        const sectionId = $element.attr('id');
        if (sectionId) {
          subSection.id = sectionId;
        }
        
        // Process remaining content
        processContentElements($, subSection, $element.children());
        
        section.children.push(subSection);
        break;
    }
  });
}

function sanitizeContentString(content: string): string {
  // First decode HTML entities
  const decoded = decode(content);
  
  // Then sanitize the HTML but keep certain elements
  const sanitized = sanitizeHtml(decoded, {
    allowedTags: false, // Allow all tags
    allowedAttributes: false, // Allow all attributes
    textFilter: (text) => {
      // Collapse multiple spaces and trim
      return text.replace(/\s+/g, ' ').trim();
    }
  });
  
  return sanitized;
}
