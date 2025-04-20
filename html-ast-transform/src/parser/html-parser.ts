import { JSDOM } from 'jsdom';
import { performance } from 'node:perf_hooks';
import { TextDecoder } from 'node:util';

import type {
  AstNode,
  DocumentNode,
  ElementNode,
  TextNode,
  CommentNode,
  Doctype,
  Parser,
  ParserOptions,
  ParseResult,
  SourcePosition
} from '../types/index.js';

/**
 * HTML parser implementation using JSDOM.
 * Uses Node.js v22+ features for performance and text handling.
 */
export class HtmlParser implements Parser {
  private decoder: TextDecoder;
  
  /**
   * Create a new HTML parser instance.
   */
  constructor() {
    this.decoder = new TextDecoder('utf-8');
  }
  
  /**
   * Parse HTML string into an AST.
   * 
   * @param html HTML string to parse
   * @param options Parsing options
   * @returns ParseResult containing the AST and metadata
   */
  async parse(html: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = options.collectMetrics ? performance.now() : 0;
    
    // Parse HTML using JSDOM
    const jsdomOptions = {
      includeNodeLocations: options.includePositions === true
    };
    
    const { window } = new JSDOM(html, jsdomOptions);
    const { document } = window;
    
    // Get node locations if requested
    const nodeLocations = options.includePositions 
      ? (window as any).document._nodeLocations 
      : null;
    
    // Create DocumentNode from DOM
    const ast = this.createDocumentNode(document, nodeLocations, options);
    
    // Create metadata
    const meta: ParseResult['meta'] = {};
    
    if (options.collectMetrics) {
      meta.parseTime = performance.now() - startTime;
      meta.nodeCount = this.countNodes(ast);
    }
    
    // Clean up JSDOM
    window.close();
    
    return { ast, meta };
  }
  
  /**
   * Create a DocumentNode from a DOM Document.
   * 
   * @param document DOM Document
   * @param nodeLocations Node locations map (if available)
   * @param options Parsing options
   * @returns DocumentNode representing the document
   */
  private createDocumentNode(
    document: Document, 
    nodeLocations: Map<Node, any> | null,
    options: ParserOptions
  ): DocumentNode {
    const doctype = document.doctype ? {
      name: document.doctype.name,
      publicId: document.doctype.publicId,
      systemId: document.doctype.systemId
    } as Doctype : undefined;
    
    const documentNode: DocumentNode = {
      type: 'document',
      children: [],
      doctype
    };
    
    if (document.documentElement) {
      const rootNode = this.createElementNode(
        document.documentElement, 
        documentNode, 
        nodeLocations,
        options
      );
      documentNode.children = [rootNode];
    }
    
    return documentNode;
  }
  
  /**
   * Create an ElementNode from a DOM Element.
   * 
   * @param element DOM Element
   * @param parent Parent AstNode
   * @param nodeLocations Node locations map (if available)
   * @param options Parsing options
   * @returns ElementNode representing the element
   */
  private createElementNode(
    element: Element, 
    parent: AstNode, 
    nodeLocations: Map<Node, any> | null,
    options: ParserOptions
  ): ElementNode {
    const attributes: Record<string, string> = {};
    
    // Process attributes
    for (const { name, value } of element.attributes) {
      attributes[name] = value;
    }
    
    const node: ElementNode = {
      type: 'element',
      name: element.tagName.toLowerCase(),
      attributes,
      children: [],
      parent,
      selfClosing: this.isSelfClosingTag(element.tagName.toLowerCase())
    };
    
    // Add source position if available
    if (nodeLocations) {
      const location = nodeLocations.get(element);
      if (location) {
        node.sourcePosition = this.convertLocation(location);
      }
    }
    
    // Process children
    for (const child of element.childNodes) {
      if (child.nodeType === child.ELEMENT_NODE) {
        const childElement = child as Element;
        const childNode = this.createElementNode(
          childElement, 
          node, 
          nodeLocations,
          options
        );
        node.children.push(childNode);
      } else if (child.nodeType === child.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim() || options.preserveWhitespace) {
          const textNode = this.createTextNode(
            text, 
            node, 
            nodeLocations ? nodeLocations.get(child) : null
          );
          node.children.push(textNode);
        }
      } else if (child.nodeType === child.COMMENT_NODE) {
        const commentNode = this.createCommentNode(
          child.textContent || '', 
          node, 
          nodeLocations ? nodeLocations.get(child) : null
        );
        node.children.push(commentNode);
      }
    }
    
    return node;
  }
  
  /**
   * Create a TextNode from a text string.
   * 
   * @param text Text content
   * @param parent Parent AstNode
   * @param location Node location (if available)
   * @returns TextNode representing the text
   */
  private createTextNode(
    text: string, 
    parent: AstNode, 
    location: any | null
  ): TextNode {
    const node: TextNode = {
      type: 'text',
      value: text,
      parent
    };
    
    if (location) {
      node.sourcePosition = this.convertLocation(location);
    }
    
    return node;
  }
  
  /**
   * Create a CommentNode from a comment string.
   * 
   * @param comment Comment content
   * @param parent Parent AstNode
   * @param location Node location (if available)
   * @returns CommentNode representing the comment
   */
  private createCommentNode(
    comment: string, 
    parent: AstNode, 
    location: any | null
  ): CommentNode {
    const node: CommentNode = {
      type: 'comment',
      value: comment,
      parent
    };
    
    if (location) {
      node.sourcePosition = this.convertLocation(location);
    }
    
    return node;
  }
  
  /**
   * Convert JSDOM location to SourcePosition.
   * 
   * @param location JSDOM location object
   * @returns SourcePosition object
   */
  private convertLocation(location: any): SourcePosition {
    return {
      startLine: location.startLine,
      startCol: location.startCol,
      endLine: location.endLine,
      endCol: location.endCol
    };
  }
  
  /**
   * Check if a tag is self-closing.
   * 
   * @param tagName Tag name to check
   * @returns True if the tag is self-closing, false otherwise
   */
  private isSelfClosingTag(tagName: string): boolean {
    return [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ].includes(tagName);
  }
  
  /**
   * Count the number of nodes in an AST.
   * 
   * @param node Root node to count from
   * @returns Number of nodes
   */
  private countNodes(node: AstNode): number {
    let count = 1; // Count the current node
    
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    
    return count;
  }
}
