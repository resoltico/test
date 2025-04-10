/**
 * HTML5 Processor Plugin
 * 
 * A rehype plugin that provides enhanced handling for HTML5 elements
 * to ensure they're properly converted to appropriate Markdown.
 */

import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

interface Element extends Node {
  tagName: string;
  properties?: {
    [key: string]: any;
  };
  children: Node[];
  data?: {
    [key: string]: any;
  };
}

interface TextNode extends Node {
  type: 'text';
  value: string;
}

/**
 * Map of HTML5 elements to their appropriate representation in Markdown
 */
const HTML5_ELEMENTS_MAP: Record<string, { tag: string, transform?: (el: Element) => void }> = {
  // Sectioning elements
  'article': { tag: 'div' },
  'aside': { tag: 'div' },
  'nav': { tag: 'div' },
  'section': { tag: 'div' },
  'header': { tag: 'div' },
  'footer': { tag: 'div' },
  'main': { tag: 'div' },
  
  // Text content
  'figure': { 
    tag: 'div',
    transform: transformFigure
  },
  'figcaption': { 
    tag: 'p',
    transform: (el) => {
      // Mark figcaptions for italic formatting
      if (!el.data) el.data = {};
      el.data.isCaption = true;
    }
  },
  
  // Ruby annotations (East Asian typography)
  'ruby': { 
    tag: 'span',
    transform: transformRuby
  },
  'rt': { tag: 'span' }, // Handled by ruby transform
  
  // Technical elements
  'code': { tag: 'code' },
  'var': { 
    tag: 'code',
    transform: (el) => {
      // Mark variables
      if (!el.data) el.data = {};
      el.data.isVariable = true;
    }
  },
  'kbd': { tag: 'code' },
  'samp': { tag: 'code' },
  
  // Table elements - handled by GFM
  'table': { tag: 'table' },
  'caption': { 
    tag: 'p',
    transform: (el) => {
      // Mark captions for bold formatting
      if (!el.data) el.data = {};
      el.data.isTableCaption = true;
    }
  },
  
  // Other HTML5 elements
  'details': { tag: 'details' },
  'summary': { tag: 'summary' },
  'mark': { 
    tag: 'span',
    transform: (el) => {
      // Mark highlighted text
      if (!el.data) el.data = {};
      el.data.isHighlighted = true;
    }
  },
  'time': { tag: 'span' },
  'data': { tag: 'span' },
  'meter': { tag: 'span' },
  'progress': { tag: 'span' },
  
  // Fixed: removed duplicate 'output' property
  'output': { tag: 'span' },
  
  // Definition elements
  'dl': { tag: 'dl' },
  'dt': { 
    tag: 'dt',
    transform: (el) => {
      // Mark definition terms for bold
      if (!el.data) el.data = {};
      el.data.isDefinitionTerm = true;
    }
  },
  'dd': { tag: 'dd' },
  
  // Bidirectional text
  'bdi': { tag: 'span' },
  'bdo': { tag: 'span' },
  
  // Other semantic elements
  'abbr': { 
    tag: 'span',
    transform: transformAbbreviation
  },
  'cite': { 
    tag: 'span',
    transform: (el) => {
      // Mark citations for italic
      if (!el.data) el.data = {};
      el.data.isCitation = true;
    }
  },
  'dfn': { 
    tag: 'span',
    transform: (el) => {
      // Mark definitions
      if (!el.data) el.data = {};
      el.data.isDefinition = true;
    }
  },
  'wbr': { tag: 'span' },
  
  // Form elements (typically not used in Markdown)
  'form': { tag: 'div' },
  'fieldset': { tag: 'div' },
  'legend': { 
    tag: 'p',
    transform: (el) => {
      // Mark form legends as bold
      if (!el.data) el.data = {};
      el.data.isLegend = true;
    }
  },
  'label': { tag: 'span' },
  'input': { tag: 'span' },
  'button': { tag: 'span' },
  'select': { tag: 'span' },
  'optgroup': { tag: 'span' },
  'option': { tag: 'span' },
  'textarea': { tag: 'span' },
  'datalist': { tag: 'span' },
  
  // Other elements
  'template': { tag: 'span' },
  'canvas': { tag: 'span' },
  'dialog': { tag: 'div' },
  'slot': { tag: 'span' },
  'menu': { tag: 'ul' },
  'hgroup': { tag: 'div' },
  'search': { tag: 'div' }
};

/**
 * Plugin to handle HTML5 elements
 */
export function handleHtml5Elements() {
  return function transformer(tree: Node) {
    visit(tree, 'element', (node: Element) => {
      // Check if this is an HTML5 element we need to handle
      const elementInfo = HTML5_ELEMENTS_MAP[node.tagName];
      if (elementInfo) {
        // Apply the transformation if specified
        if (elementInfo.transform) {
          elementInfo.transform(node);
        }
        
        // Change the tag name to the appropriate HTML element
        node.tagName = elementInfo.tag;
        
        // Make sure the node has data for further processing
        if (!node.data) {
          node.data = {};
        }
        
        // Record the original tag for reference
        node.data.originalTag = node.tagName;
      }
    });
  };
}

/**
 * Transform a figure element
 */
function transformFigure(node: Element): void {
  // Check for figcaption
  let caption: Element | null = null;
  let captionIndex = -1;
  
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i] as Element;
    if (child.tagName === 'figcaption') {
      caption = child;
      captionIndex = i;
      break;
    }
  }
  
  // If there's a caption, ensure it's processed properly
  if (caption && captionIndex !== -1) {
    // If the caption is not the last element, move it to the end
    if (captionIndex !== node.children.length - 1) {
      node.children.splice(captionIndex, 1);
      node.children.push(caption);
    }
    
    // Mark it as italic
    if (!caption.data) caption.data = {};
    caption.data.isCaption = true;
  }
  
  // Store that this was a figure
  if (!node.data) node.data = {};
  node.data.isFigure = true;
}

/**
 * Transform a ruby element (used for pronunciation guides)
 */
function transformRuby(node: Element): void {
  // Find the base text and the pronunciation (rt)
  let baseText = '';
  let rtText = '';
  
  node.children.forEach(child => {
    if ((child as Element).tagName === 'rt') {
      rtText += extractTextContent(child);
    } else if (child.type === 'text') {
      baseText += (child as TextNode).value;
    } else {
      // For other elements, extract text
      baseText += extractTextContent(child);
    }
  });
  
  // Replace the node's children with a formatted representation
  if (rtText) {
    node.children = [{
      type: 'text',
      value: `${baseText}${rtText ? '(' + rtText + ')' : ''}`
    } as TextNode];
  }
  
  // Store that this was a ruby annotation
  if (!node.data) node.data = {};
  node.data.isRuby = true;
}

/**
 * Transform an abbreviation
 */
function transformAbbreviation(node: Element): void {
  // Get the title (full form) if available
  const title = node.properties?.title;
  
  // Store the title for later processing
  if (title) {
    if (!node.data) node.data = {};
    node.data.abbreviationTitle = title;
  }
  
  // Mark as abbreviation
  if (!node.data) node.data = {};
  node.data.isAbbreviation = true;
}

/**
 * Extract text content from a node
 */
function extractTextContent(node: Node): string {
  let result = '';
  
  function extractText(node: Node): void {
    if (node.type === 'text') {
      result += (node as TextNode).value;
    } else if ((node as Element).children) {
      for (const child of (node as Element).children) {
        extractText(child);
      }
    }
  }
  
  extractText(node);
  return result;
}