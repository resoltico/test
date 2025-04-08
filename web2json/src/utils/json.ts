import { logger } from './logger.js';
import { documentSchema } from '../schema/document.js';

/**
 * Formats a JSON object with pretty-printing
 */
export function formatJson(data: unknown): string {
  // Space value of 2 gives a nice readable indentation
  return JSON.stringify(data, null, 2);
}

/**
 * Validates the JSON structure against our schema
 */
export function validateJsonStructure(data: unknown): boolean {
  try {
    // Make sure sections have required properties
    ensureRequiredProperties(data);
    
    // Use Zod to validate the structure
    const result = documentSchema.safeParse(data);
    
    if (!result.success) {
      logger.error('JSON validation failed', new Error(result.error.message));
      
      // Log specific validation errors for debugging
      result.error.errors.forEach(err => {
        logger.error(`Validation error at path: ${err.path.join('.')} - ${err.message}`);
      });
      
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('JSON validation error', error as Error);
    return false;
  }
}

/**
 * Ensure all required properties are present in the document structure
 */
function ensureRequiredProperties(data: any): void {
  if (!data || typeof data !== 'object') return;
  
  // Handle arrays recursively
  if (Array.isArray(data)) {
    data.forEach(item => ensureRequiredProperties(item));
    return;
  }
  
  // Handle section objects
  if (data.type === 'section' || data.type === 'aside') {
    // Ensure required arrays exist
    if (!Array.isArray(data.content)) {
      data.content = [];
    }
    
    if (!Array.isArray(data.children)) {
      data.children = [];
    }
    
    // Process formula if it exists
    if (data.formula && !Array.isArray(data.formula.terms)) {
      data.formula.terms = [];
    }
  } else if (data.type === 'article') {
    // Ensure article has children array
    if (!Array.isArray(data.children)) {
      data.children = [];
    }
  } else if (data.type === 'quote' || data.type === 'search' || 
             data.type === 'footer' || data.type === 'header') {
    // Ensure these elements have children array
    if (!Array.isArray(data.children)) {
      data.children = [];
    }
  }
  
  // Process properties recursively
  Object.entries(data).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      ensureRequiredProperties(value);
    }
  });
}

/**
 * Clean up the JSON structure to match the expected format
 * This removes empty arrays, null values, etc. and ensures
 * proper structure alignment with expected output
 */
export function cleanupJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    // Filter out null/undefined values from arrays
    return obj
      .map(item => cleanupJson(item))
      .filter(item => item !== undefined);
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    
    // Process object properties
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = cleanupJson(value);
      
      // Include empty arrays for required fields
      if (cleaned !== undefined || isRequiredArray(key)) {
        result[key] = cleaned === undefined && isRequiredArray(key) 
                     ? [] : cleaned;
      }
    }
    
    // Ensure required properties exist
    if (obj.type === 'section' || obj.type === 'aside') {
      if (!result.content) result.content = [];
      if (!result.children) result.children = [];
    } else if (obj.type === 'article') {
      if (!result.children) result.children = [];
    } else if (['quote', 'search', 'footer', 'header'].includes(obj.type)) {
      if (!result.children) result.children = [];
    }
    
    return result;
  }
  
  // Return primitive values as-is
  return obj;
}

/**
 * Check if a property is a required array
 */
function isRequiredArray(key: string): boolean {
  return ['content', 'children', 'terms', 'ordered-list', 'unordered-list'].includes(key);
}

/**
 * Safe stringify that handles circular references
 */
export function safeStringify(obj: unknown): string {
  // Create a cache to store seen objects
  const seenObjects = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seenObjects.has(value)) {
        return '[Circular Reference]';
      }
      seenObjects.add(value);
    }
    return value;
  }, 2);
}

/**
 * Add missing but required properties to ensure the document
 * structure matches the expected output
 */
export function ensureDocumentStructure(document: any): any {
  if (!document || typeof document !== 'object') return document;
  
  // Ensure top-level document properties
  if (!document.title) document.title = 'Untitled Document';
  if (!Array.isArray(document.content)) document.content = [];
  
  // Process content items
  document.content = document.content.map((item: any) => {
    return ensureContentItemStructure(item);
  });
  
  return document;
}

/**
 * Ensure a content item has the required structure
 */
function ensureContentItemStructure(item: any): any {
  if (!item || typeof item !== 'object') return item;
  
  // Ensure item has a type
  if (!item.type) {
    // Try to infer type from properties
    if (item.children && Array.isArray(item.children)) {
      item.type = 'section';
    } else if (item.content && typeof item.content === 'string') {
      item.type = 'quote';
    } else {
      item.type = 'section';
    }
  }
  
  // Process based on type
  switch (item.type) {
    case 'section':
    case 'aside':
      return ensureSectionStructure(item);
      
    case 'article':
      return ensureArticleStructure(item);
      
    case 'quote':
      return ensureQuoteStructure(item);
      
    case 'search':
    case 'footer':
    case 'header':
      return ensureBasicStructure(item);
      
    default:
      return item;
  }
}

/**
 * Ensure a section has the required structure
 */
function ensureSectionStructure(section: any): any {
  if (!section.id) {
    section.id = `section-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  if (!Array.isArray(section.content)) {
    section.content = [];
  }
  
  if (!Array.isArray(section.children)) {
    section.children = [];
  } else {
    // Process children recursively
    section.children = section.children.map((child: any) => ensureContentItemStructure(child));
  }
  
  // Process formula if present
  if (section.formula && !Array.isArray(section.formula.terms)) {
    section.formula.terms = [];
  }
  
  return section;
}

/**
 * Ensure an article has the required structure
 */
function ensureArticleStructure(article: any): any {
  if (!article.id) {
    article.id = `article-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  if (!Array.isArray(article.children)) {
    article.children = [];
  } else {
    // Process children recursively
    article.children = article.children.map((child: any) => ensureContentItemStructure(child));
  }
  
  return article;
}

/**
 * Ensure a quote has the required structure
 */
function ensureQuoteStructure(quote: any): any {
  if (!Array.isArray(quote.children)) {
    quote.children = [];
  }
  
  return quote;
}

/**
 * Ensure basic elements have required structure
 */
function ensureBasicStructure(item: any): any {
  if (!Array.isArray(item.children)) {
    item.children = [];
  }
  
  return item;
}