/**
 * Schema Processor Module
 * 
 * Applies schema transformations to AST nodes in the unified pipeline.
 * This handles both HTML and Markdown AST transformations based on the schema.
 */

import { visit, SKIP } from 'unist-util-visit';
import { unified, Processor } from 'unified';
import type { Node } from 'unist';
import { Schema } from './validation.js';

type ProcessorStage = 'html' | 'markdown';

interface Element extends Node {
  tagName: string;
  properties?: {
    [key: string]: any;
    className?: string[];
  };
  children: Node[];
  data?: {
    [key: string]: any;
  };
  remove?: boolean;
  keepAsHtml?: boolean;
}

interface TextNode extends Node {
  type: 'text';
  value: string;
}

type Rule = NonNullable<Schema['rules']>[number];

/**
 * Apply schema to the processor
 * 
 * @param processor - The unified processor to augment
 * @param schema - The schema to apply
 * @param stage - Whether we're in the HTML or Markdown processing stage
 * @returns The augmented processor
 */
export function applySchema(
  processor: Processor,
  schema: Schema, 
  stage: ProcessorStage
): Processor {
  // Apply global settings if we're in the Markdown stage
  // (HTML stage transformations don't use global settings)
  if (stage === 'markdown' && schema.global) {
    // Global settings are applied in the pipeline.ts file
    // when configuring remark-stringify
  }
  
  // Apply rules if any exist
  if (schema.rules && schema.rules.length > 0) {
    processor = (processor.use(() => {
      return (tree: Node) => {
        // Process each rule
        for (const rule of schema.rules!) {
          applyRule(tree, rule, stage);
        }
        return tree;
      };
    }) as any);
  }
  
  // Apply remove patterns if any exist
  if (schema.remove && schema.remove.length > 0) {
    processor = (processor.use(() => {
      return (tree: Node) => {
        // Only apply in HTML stage
        if (stage === 'html') {
          applyRemovePatterns(tree, schema.remove!);
        }
        return tree;
      };
    }) as any);
  }
  
  // Apply keep patterns if any exist
  if (schema.keep && schema.keep.length > 0) {
    processor = (processor.use(() => {
      return (tree: Node) => {
        // Only apply in HTML stage
        if (stage === 'html') {
          applyKeepPatterns(tree, schema.keep!);
        }
        return tree;
      };
    }) as any);
  }
  
  return processor as any;
}

/**
 * Apply a single rule to an AST
 */
function applyRule(tree: Node, rule: Rule, stage: ProcessorStage): void {
  // Find nodes that match the selector
  const matchingNodes: Element[] = findMatchingNodes(tree, rule.selector, stage);
  
  // Apply the action to each matching node
  for (const node of matchingNodes) {
    switch (rule.action) {
      case 'transform':
        // General transformation based on options
        applyTransformation(node, rule.options || {}, stage);
        break;
        
      case 'codeBlock':
        // Transform into a code block
        transformToCodeBlock(node, rule.options || {}, stage);
        break;
        
      case 'heading':
        // Transform into a heading
        transformToHeading(node, rule.options || {}, stage);
        break;
        
      case 'list':
        // Transform into a list
        transformToList(node, rule.options || {}, stage);
        break;
        
      case 'table':
        // Transform into a table
        transformToTable(node, rule.options || {}, stage);
        break;
        
      case 'remove':
        // Mark for removal
        node.remove = true;
        break;
        
      case 'keep':
        // Mark to keep as HTML
        node.keepAsHtml = true;
        break;
    }
  }
  
  // Remove nodes marked for removal
  visit(tree, 'element', (node: Node, index: number | null, parent: Node | null) => {
    const elementNode = node as Element;
    if (elementNode.remove && parent && typeof index === 'number') {
      (parent as Element).children.splice(index, 1);
      return [SKIP, index];
    }
    return undefined;
  });
}

/**
 * Find nodes that match a CSS-like selector
 */
function findMatchingNodes(tree: Node, selector: string, stage: ProcessorStage): Element[] {
  const matchingNodes: Element[] = [];
  
  // Parse the selector - more comprehensive implementation
  const selectorParts = parseSelector(selector);
  
  // Find matching nodes
  visit(tree, 'element', (node: Element) => {
    if (stage === 'html') {
      // For HTML stage, match elements
      let isMatch = true;
      
      // Match each part of the selector
      for (const part of selectorParts) {
        // Match tag name if specified
        if (part.tag && part.tag !== '*' && node.tagName !== part.tag) {
          isMatch = false;
          break;
        }
        
        // Match class name if specified
        if (part.class && node.properties && node.properties.className) {
          let classNames = node.properties.className;
          if (!Array.isArray(classNames)) {
            classNames = [classNames as string];
          }
          
          if (!classNames.includes(part.class)) {
            isMatch = false;
            break;
          }
        }
        
        // Match ID if specified
        if (part.id && node.properties && node.properties.id !== part.id) {
          isMatch = false;
          break;
        }
        
        // Match attribute if specified
        if (part.attribute && part.value) {
          const attrName = part.attribute;
          const attrValue = part.value;
          const attrOp = part.attributeOp || '=';
          
          if (!node.properties || !(attrName in node.properties)) {
            isMatch = false;
            break;
          }
          
          const nodeAttrValue = node.properties[attrName];
          
          switch (attrOp) {
            case '=':
              if (nodeAttrValue !== attrValue) {
                isMatch = false;
              }
              break;
            case '^=':
              if (typeof nodeAttrValue !== 'string' || !nodeAttrValue.startsWith(attrValue)) {
                isMatch = false;
              }
              break;
            case '$=':
              if (typeof nodeAttrValue !== 'string' || !nodeAttrValue.endsWith(attrValue)) {
                isMatch = false;
              }
              break;
            case '*=':
              if (typeof nodeAttrValue !== 'string' || !nodeAttrValue.includes(attrValue)) {
                isMatch = false;
              }
              break;
            case '~=':
              if (typeof nodeAttrValue !== 'string' || 
                  !nodeAttrValue.split(/\s+/).includes(attrValue)) {
                isMatch = false;
              }
              break;
            case '|=':
              if (typeof nodeAttrValue !== 'string' || 
                  !(nodeAttrValue === attrValue || nodeAttrValue.startsWith(attrValue + '-'))) {
                isMatch = false;
              }
              break;
          }
          
          if (!isMatch) break;
        }
      }
      
      if (isMatch) {
        matchingNodes.push(node);
      }
    }
    // Markdown stage matching would go here, but is more complex
    // as remark AST doesn't have the same structure as rehype AST
  });
  
  return matchingNodes;
}

/**
 * Parse a CSS selector into its components
 */
function parseSelector(selector: string): Array<{
  tag?: string;
  id?: string;
  class?: string;
  attribute?: string;
  attributeOp?: string;
  value?: string;
}> {
  // This is a more comprehensive selector parser
  // It handles: element, .class, #id, [attr], [attr=value], and basic combinations
  
  const parts: Array<{
    tag?: string;
    id?: string;
    class?: string;
    attribute?: string;
    attributeOp?: string;
    value?: string;
  }> = [];
  
  // Split on commas for multiple selectors
  const selectors = selector.split(',').map(s => s.trim());
  
  for (const sel of selectors) {
    const part: {
      tag?: string;
      id?: string;
      class?: string;
      attribute?: string;
      attributeOp?: string;
      value?: string;
    } = {};
    
    // Extract element name
    const elementMatch = sel.match(/^([a-zA-Z0-9*]+)?/);
    if (elementMatch && elementMatch[1]) {
      part.tag = elementMatch[1];
    }
    
    // Extract class names
    const classMatch = sel.match(/\.([a-zA-Z0-9\-_]+)/);
    if (classMatch) {
      part.class = classMatch[1];
    }
    
    // Extract ID
    const idMatch = sel.match(/#([a-zA-Z0-9\-_]+)/);
    if (idMatch) {
      part.id = idMatch[1];
    }
    
    // Extract attributes
    const attrMatch = sel.match(/\[([a-zA-Z0-9\-_]+)(?:([~|^$*]?=)['"]?([^\]'"]+)['"]?)?\]/);
    if (attrMatch) {
      part.attribute = attrMatch[1];
      if (attrMatch[2]) {
        part.attributeOp = attrMatch[2];
        part.value = attrMatch[3];
      }
    }
    
    parts.push(part);
  }
  
  return parts;
}

/**
 * Apply a general transformation based on options
 */
function applyTransformation(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  // Apply transformations based on the options and stage
  if (stage === 'html') {
    // HTML-specific transformations
    
    // Example: Add data attributes
    if (options.dataAttributes) {
      if (!node.properties) {
        node.properties = {};
      }
      
      for (const [key, value] of Object.entries(options.dataAttributes)) {
        node.properties[`data-${key}`] = value;
      }
    }
    
    // Add class names if specified
    if (options.addClass) {
      if (!node.properties) {
        node.properties = {};
      }
      
      if (!node.properties.className) {
        node.properties.className = [];
      } else if (!Array.isArray(node.properties.className)) {
        node.properties.className = [node.properties.className as string];
      }
      
      // Add the class(es)
      const classesToAdd = Array.isArray(options.addClass) 
        ? options.addClass 
        : [options.addClass];
      
      for (const cls of classesToAdd) {
        if (!node.properties.className.includes(cls)) {
          node.properties.className.push(cls);
        }
      }
    }
    
    // Remove class names if specified
    if (options.removeClass) {
      if (node.properties && node.properties.className) {
        if (!Array.isArray(node.properties.className)) {
          node.properties.className = [node.properties.className as string];
        }
        
        // Remove the class(es)
        const classesToRemove = Array.isArray(options.removeClass) 
          ? options.removeClass 
          : [options.removeClass];
        
        node.properties.className = node.properties.className.filter(
          cls => !classesToRemove.includes(cls)
        );
      }
    }
  }
}

/**
 * Transform a node into a code block
 */
function transformToCodeBlock(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  if (stage === 'html') {
    // Extract the content
    const content = extractTextContent(node);
    
    // Transform the node
    node.tagName = 'pre';
    node.properties = {};
    
    // Create the code element with proper language class if specified
    const codeElement: Element = {
      type: 'element',
      tagName: 'code',
      properties: options.language ? { className: [`language-${options.language}`] } : {},
      children: [{ type: 'text', value: content }] as Node[]
    };
    
    node.children = [codeElement];
    
    // Set data for post-processing
    if (!node.data) node.data = {};
    node.data.isCodeBlock = true;
    if (options.language) {
      node.data.language = options.language;
    }
  }
}

/**
 * Transform a node into a heading
 */
function transformToHeading(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  if (stage === 'html') {
    // Determine heading level (default to 2 if not specified)
    const level = options.level || 2;
    
    // Transform the node
    node.tagName = `h${level}`;
    
    // Set data for post-processing
    if (!node.data) node.data = {};
    node.data.isHeading = true;
    node.data.headingLevel = level;
  }
}

/**
 * Transform a node into a list
 */
function transformToList(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  if (stage === 'html') {
    // Determine list type (default to unordered)
    const isOrdered = options.ordered || false;
    
    // Extract child items
    const childItems = extractListItems(node, options);
    
    // Create list items
    const listItems = childItems.map((content: string) => {
      return {
        type: 'element',
        tagName: 'li',
        properties: {},
        children: [{ 
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: content }]
        }]
      } as Element;
    });
    
    // Transform the node
    node.tagName = isOrdered ? 'ol' : 'ul';
    node.properties = {};
    node.children = listItems;
    
    // Set data for post-processing
    if (!node.data) node.data = {};
    node.data.isList = true;
    node.data.isOrdered = isOrdered;
  }
}

/**
 * Transform a node into a table
 */
function transformToTable(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  if (stage === 'html') {
    // This is a more comprehensive table transformation
    
    // Check if we need to create a table structure
    if (node.tagName !== 'table') {
      // Try to extract data to create a table
      const tableData = extractTableData(node, options);
      
      if (tableData.headers.length > 0 || tableData.rows.length > 0) {
        // Create a table structure
        const tableNode: Element = {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: []
        };
        
        // Add caption if specified
        if (options.caption) {
          tableNode.children.push({
            type: 'element',
            tagName: 'caption',
            properties: {},
            children: [{ type: 'text', value: options.caption }]
          } as Element);
        }
        
        // Add header row if we have headers
        if (tableData.headers.length > 0) {
          const theadNode: Element = {
            type: 'element',
            tagName: 'thead',
            properties: {},
            children: [{
              type: 'element',
              tagName: 'tr',
              properties: {},
              children: tableData.headers.map(header => ({
                type: 'element',
                tagName: 'th',
                properties: {},
                children: [{ type: 'text', value: header }]
              } as Element))
            }]
          };
          
          tableNode.children.push(theadNode);
        }
        
        // Add body rows
        if (tableData.rows.length > 0) {
          const tbodyNode: Element = {
            type: 'element',
            tagName: 'tbody',
            properties: {},
            children: tableData.rows.map(row => ({
              type: 'element',
              tagName: 'tr',
              properties: {},
              children: row.map(cell => ({
                type: 'element',
                tagName: 'td',
                properties: {},
                children: [{ type: 'text', value: cell }]
              } as Element))
            } as Element))
          };
          
          tableNode.children.push(tbodyNode);
        }
        
        // Replace the original node's properties
        node.tagName = 'table';
        node.properties = {};
        node.children = tableNode.children;
      }
    }
    
    // Set data for post-processing
    if (!node.data) node.data = {};
    node.data.isTable = true;
    node.data.includeCaption = options.includeCaption !== false;
    node.data.withHeader = options.withHeader !== false;
  }
}

/**
 * Apply remove patterns to an AST
 */
function applyRemovePatterns(tree: Node, patterns: string[]): void {
  for (const pattern of patterns) {
    const matchingNodes = findMatchingNodes(tree, pattern, 'html');
    for (const node of matchingNodes) {
      node.remove = true;
    }
  }
  
  // Remove nodes marked for removal
  visit(tree, 'element', (node: Node, index: number | null, parent: Node | null) => {
    const elementNode = node as Element;
    if (elementNode.remove && parent && typeof index === 'number') {
      (parent as Element).children.splice(index, 1);
      return [SKIP, index];
    }
    return undefined;
  });
}

/**
 * Apply keep patterns to an AST
 */
function applyKeepPatterns(tree: Node, patterns: string[]): void {
  for (const pattern of patterns) {
    const matchingNodes = findMatchingNodes(tree, pattern, 'html');
    for (const node of matchingNodes) {
      node.keepAsHtml = true;
      
      // Mark all descendants as well
      visit(node, 'element', (descendant: Element) => {
        descendant.keepAsHtml = true;
      });
    }
  }
  
  // Process nodes marked to keep as HTML
  visit(tree, 'element', (node: Element) => {
    if (node.keepAsHtml) {
      // Store HTML representation for later restoration
      if (!node.data) node.data = {};
      node.data.hName = node.tagName;
      node.data.hProperties = node.properties || {};
      node.data.keepAsHtml = true;
    }
  });
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

/**
 * Extract list items from a node
 */
function extractListItems(node: Element, options: Record<string, any>): string[] {
  const items: string[] = [];
  
  // Check for selector option to find items
  if (options.itemSelector) {
    const itemNodes = findMatchingNodes(node, options.itemSelector, 'html');
    for (const itemNode of itemNodes) {
      const content = extractTextContent(itemNode);
      if (content.trim()) {
        items.push(content.trim());
      }
    }
  } else {
    // Extract text content from each child node
    if (node.children) {
      for (const child of node.children) {
        // Skip non-element children
        if ((child as Element).tagName) {
          const content = extractTextContent(child);
          if (content.trim()) {
            items.push(content.trim());
          }
        }
      }
    }
  }
  
  return items;
}

/**
 * Extract table data from a node
 */
function extractTableData(node: Element, options: Record<string, any>): {
  headers: string[];
  rows: string[][];
} {
  const result = {
    headers: [] as string[],
    rows: [] as string[][]
  };
  
  // Check for header selector option
  if (options.headerSelector) {
    const headerNodes = findMatchingNodes(node, options.headerSelector, 'html');
    result.headers = headerNodes.map(node => extractTextContent(node).trim());
  }
  
  // Check for row selector option
  if (options.rowSelector) {
    const rowNodes = findMatchingNodes(node, options.rowSelector, 'html');
    
    for (const rowNode of rowNodes) {
      // Check for cell selector option
      let cellNodes: Element[] = [];
      if (options.cellSelector) {
        cellNodes = findMatchingNodes(rowNode, options.cellSelector, 'html');
      } else {
        // Assume direct children are cells
        cellNodes = rowNode.children.filter(
          child => (child as Element).tagName
        ) as Element[];
      }
      
      // Extract cell content
      const rowData = cellNodes.map(cell => extractTextContent(cell).trim());
      if (rowData.length > 0) {
        result.rows.push(rowData);
      }
    }
  }
  
  return result;
}