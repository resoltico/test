/**
 * Schema Processor Module
 * 
 * Applies schema transformations to AST nodes in the unified pipeline.
 * This handles both HTML and Markdown AST transformations based on the schema.
 */

import { visit } from 'unist-util-visit';
import { SKIP } from 'unist-util-visit';
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
    processor = processor.use(() => {
      return (tree: Node) => {
        // Process each rule
        for (const rule of schema.rules!) {
          applyRule(tree, rule, stage);
        }
      };
    });
  }
  
  // Apply remove patterns if any exist
  if (schema.remove && schema.remove.length > 0) {
    processor = processor.use(() => {
      return (tree: Node) => {
        // Only apply in HTML stage
        if (stage === 'html') {
          applyRemovePatterns(tree, schema.remove!);
        }
      };
    });
  }
  
  // Apply keep patterns if any exist
  if (schema.keep && schema.keep.length > 0) {
    processor = processor.use(() => {
      return (tree: Node) => {
        // Only apply in HTML stage
        if (stage === 'html') {
          applyKeepPatterns(tree, schema.keep!);
        }
      };
    });
  }
  
  return processor;
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
  visit(tree, (node: Node, index: number | null, parent: Node | null) => {
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
  
  // This is a simplified implementation
  // A full implementation would use a proper CSS selector parser
  
  // Parse the selector - very basic implementation
  const [tagName, className] = parseSimpleSelector(selector);
  
  // Find matching nodes
  visit(tree, 'element', (node: Element) => {
    if (stage === 'html') {
      // For HTML stage, match elements
      let isMatch = true;
      
      // Match tag name if specified
      if (tagName && tagName !== '*' && node.tagName !== tagName) {
        isMatch = false;
      }
      
      // Match class name if specified
      if (className && node.properties && node.properties.className) {
        if (!Array.isArray(node.properties.className)) {
          node.properties.className = [node.properties.className as string];
        }
        
        if (!node.properties.className.includes(className)) {
          isMatch = false;
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
 * Parse a simple CSS selector
 * This is a very basic implementation that only handles element.class selectors
 */
function parseSimpleSelector(selector: string): [string | null, string | null] {
  // Check for class selector
  const classMatch = selector.match(/^([a-zA-Z0-9\*]*)\.([a-zA-Z0-9\-_]+)$/);
  if (classMatch) {
    return [classMatch[1] || null, classMatch[2]];
  }
  
  // Just an element selector
  if (/^[a-zA-Z0-9\*]+$/.test(selector)) {
    return [selector, null];
  }
  
  // Unsupported selector, return nulls
  return [null, null];
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
    node.children = [{
      type: 'element',
      tagName: 'code',
      properties: options.language ? { className: [`language-${options.language}`] } : {},
      children: [{ type: 'text', value: content }]
    } as Element];
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
  }
}

/**
 * Transform a node into a list
 */
function transformToList(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  if (stage === 'html') {
    // Extract child items (assume direct children are list items)
    const childItems = extractListItems(node);
    
    // Create list items
    const listItems = childItems.map((content: string) => {
      return {
        type: 'element',
        tagName: 'li',
        properties: {},
        children: [{ type: 'text', value: content }]
      } as Element;
    });
    
    // Determine list type (default to unordered)
    const isOrdered = options.ordered || false;
    
    // Transform the node
    node.tagName = isOrdered ? 'ol' : 'ul';
    node.properties = {};
    node.children = listItems;
  }
}

/**
 * Transform a node into a table
 */
function transformToTable(node: Element, options: Record<string, any>, stage: ProcessorStage): void {
  if (stage === 'html') {
    // This is a placeholder for table transformation
    // A full implementation would parse the content and create a proper table structure
    node.tagName = 'table';
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
  visit(tree, (node: Node, index: number | null, parent: Node | null) => {
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
    }
  }
  
  // Process nodes marked to keep as HTML
  // This is a placeholder - a full implementation would need to
  // properly preserve the HTML representation
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
function extractListItems(node: Element): string[] {
  const items: string[] = [];
  
  // Extract text content from each child node
  if (node.children) {
    for (const child of node.children) {
      const content = extractTextContent(child);
      if (content.trim()) {
        items.push(content.trim());
      }
    }
  }
  
  return items;
}