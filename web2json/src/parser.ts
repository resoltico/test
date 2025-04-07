// src/parser.ts
import { Document, Section } from './schema/index.js';
import * as cheerio from 'cheerio';
import { 
  createCheerio, 
  extractMetadata, 
  cleanHtmlContent
} from './utils/html.js';
import { normalizeJson } from './utils/json.js';
import { 
  processSection, 
  processSections,
  processTable,
  processForm,
  processFigure,
  processQuote,
  processFormula,
  processSearch
} from './processors/index.js';

/**
 * Parse HTML content into a structured JSON document
 */
export async function parseHtml(html: string, url?: string): Promise<Document> {
  // Load HTML with Cheerio
  const $ = createCheerio(html);
  
  // Initialize the document structure
  const doc: Document = {
    title: $('title').text(),
    content: []
  };
  
  // Extract metadata
  const metadata = extractMetadata($);
  if (url) {
    metadata.url = url;
  }
  
  if (Object.keys(metadata).length > 0) {
    doc.metadata = metadata;
  }
  
  // Process the document structure
  try {
    // Process sections
    doc.content = processSections($);
    
    // Process special elements that may not be in sections
    processSpecialElements($, doc);
    
    // Normalize JSON to remove nulls and empty arrays
    return normalizeJson(doc) as Document;
  } catch (error) {
    throw new Error(`Error parsing HTML: ${(error as Error).message}`);
  }
}

/**
 * Process special elements that may not be within sections
 */
function processSpecialElements($: cheerio.CheerioAPI, doc: Document) {
  // Get all sections for further processing
  const allSections = getAllSections(doc.content);
  
  // Process tables
  $('table').each((_, table) => {
    const tableData = processTable($, table);
    
    // Find the containing section to add the table data
    const $section = $(table).closest('section, article, aside, div');
    if ($section.length > 0) {
      const sectionId = $section.attr('id');
      
      const matchingSection = allSections.find(s => s.id === sectionId);
      if (matchingSection) {
        matchingSection.table = tableData;
      }
    } else {
      // If no containing section, add to a new section
      doc.content.push({
        type: 'section',
        table: tableData
      });
    }
  });
  
  // Process forms
  $('form').each((_, form) => {
    const formData = processForm($, form);
    
    // Find the containing section to add the form data
    const $section = $(form).closest('section, article, aside, div');
    if ($section.length > 0) {
      const sectionId = $section.attr('id');
      
      const matchingSection = allSections.find(s => s.id === sectionId);
      if (matchingSection) {
        matchingSection.form = formData;
      }
    } else {
      // If no containing section, add to a new section
      doc.content.push({
        type: 'section',
        form: formData
      });
    }
  });
  
  // Process figures
  $('figure').each((_, figure) => {
    const figureData = processFigure($, figure);
    
    // Find the containing section to add the figure data
    const $section = $(figure).closest('section, article, aside, div');
    if ($section.length > 0) {
      const sectionId = $section.attr('id');
      
      const matchingSection = allSections.find(s => s.id === sectionId);
      if (matchingSection) {
        matchingSection.figure = figureData;
      }
    } else {
      // If no containing section, add to a new section
      doc.content.push({
        type: 'section',
        figure: figureData
      });
    }
  });
  
  // Process blockquotes
  $('blockquote').each((_, blockquote) => {
    const quoteData = processQuote($, blockquote);
    
    // Find the containing section to add the quote data
    const $section = $(blockquote).closest('section, article, aside, div');
    if ($section.length > 0) {
      const sectionId = $section.attr('id');
      
      const matchingSection = allSections.find(s => s.id === sectionId);
      if (matchingSection) {
        matchingSection.quote = quoteData;
      }
    } else {
      // If no containing section, add to a new section
      doc.content.push({
        type: 'section',
        quote: quoteData
      });
    }
  });
  
  // Process math/formula
  $('math, div:has(math)').each((_, math) => {
    const formulaData = processFormula($, math);
    
    // Find the containing section to add the formula data
    const $section = $(math).closest('section, article, aside, div');
    if ($section.length > 0) {
      const sectionId = $section.attr('id');
      
      const matchingSection = allSections.find(s => s.id === sectionId);
      if (matchingSection) {
        matchingSection.formula = formulaData;
      }
    } else {
      // If no containing section, add to a new section
      doc.content.push({
        type: 'section',
        formula: formulaData
      });
    }
  });
  
  // Process search
  $('search').each((_, search) => {
    const searchData = processSearch($, search);
    
    // Add search to document content
    doc.content.push(searchData as any);
  });
}

/**
 * Recursively get all sections from a section hierarchy
 */
function getAllSections(sections: Section[]): Section[] {
  let result: Section[] = [];
  
  for (const section of sections) {
    result.push(section);
    
    if (section.children && section.children.length > 0) {
      result = result.concat(getAllSections(section.children));
    }
  }
  
  return result;
}
