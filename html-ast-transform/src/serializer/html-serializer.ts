import type {
  AstNode,
  DocumentNode,
  ElementNode,
  TextNode,
  CommentNode,
  isElementNode,
  isTextNode,
  isCommentNode,
  isDocumentNode
} from '../types/index.js';

/**
 * Options for HTML serialization.
 */
export interface SerializeOptions {
  /**
   * Whether to pretty-print the HTML with indentation.
   * @default false
   */
  pretty?: boolean;
  
  /**
   * Indentation string for pretty-printing.
   * @default '  ' (two spaces)
   */
  indent?: string;
  
  /**
   * Whether to use XHTML self-closing tags.
   * @default false
   */
  xhtml?: boolean;
  
  /**
   * Whether to minimize empty attribute values.
   * @default true
   */
  minimizeEmptyAttributes?: boolean;
  
  /**
   * Whether to include the XML declaration in the output.
   * @default false
   */
  xmlDeclaration?: boolean;
  
  /**
   * Whether to encode entities like &, <, >, etc.
   * @default true
   */
  encodeEntities?: boolean;
}

/**
 * HTML serializer that converts an AST back to an HTML string.
 * Uses modern ES practices and is optimized for Node.js v22+.
 */
export class HtmlSerializer {
  /**
   * Serialize an AST to an HTML string.
   * 
   * @param ast The AST to serialize
   * @param options Serialization options
   * @returns HTML string
   */
  serialize(ast: AstNode, options: SerializeOptions = {}): string {
    const defaultOptions: Required<SerializeOptions> = {
      pretty: false,
      indent: '  ',
      xhtml: false,
      minimizeEmptyAttributes: true,
      xmlDeclaration: false,
      encodeEntities: true
    };
    
    const mergedOptions: Required<SerializeOptions> = {
      ...defaultOptions,
      ...options
    };
    
    return this.serializeNode(ast, mergedOptions, 0);
  }
  
  /**
   * Serialize a single node to an HTML string.
   * 
   * @param node Node to serialize
   * @param options Serialization options
   * @param depth Current indentation depth
   * @returns HTML string
   */
  private serializeNode(
    node: AstNode,
    options: Required<SerializeOptions>,
    depth: number
  ): string {
    if (isDocumentNode(node)) {
      return this.serializeDocument(node, options, depth);
    } else if (isElementNode(node)) {
      return this.serializeElement(node, options, depth);
    } else if (isTextNode(node)) {
      return this.serializeText(node, options);
    } else if (isCommentNode(node)) {
      return this.serializeComment(node, options, depth);
    }
    
    // Unknown node type, return empty string
    return '';
  }
  
  /**
   * Serialize a document node to an HTML string.
   * 
   * @param node Document node to serialize
   * @param options Serialization options
   * @param depth Current indentation depth
   * @returns HTML string
   */
  private serializeDocument(
    node: DocumentNode,
    options: Required<SerializeOptions>,
    depth: number
  ): string {
    let html = '';
    
    // Add XML declaration if requested
    if (options.xmlDeclaration) {
      html += '<?xml version="1.0" encoding="UTF-8"?>';
      
      if (options.pretty) {
        html += '\n';
      }
    }
    
    // Add DOCTYPE if present
    if (node.doctype) {
      const { name, publicId, systemId } = node.doctype;
      
      if (publicId && systemId) {
        html += `<!DOCTYPE ${name} PUBLIC "${publicId}" "${systemId}">`;
      } else if (systemId) {
        html += `<!DOCTYPE ${name} SYSTEM "${systemId}">`;
      } else {
        html += `<!DOCTYPE ${name}>`;
      }
      
      if (options.pretty) {
        html += '\n';
      }
    }
    
    // Serialize children
    for (const child of node.children || []) {
      html += this.serializeNode(child, options, depth);
    }
    
    return html;
  }
  
  /**
   * Serialize an element node to an HTML string.
   * 
   * @param node Element node to serialize
   * @param options Serialization options
   * @param depth Current indentation depth
   * @returns HTML string
   */
  private serializeElement(
    node: ElementNode,
    options: Required<SerializeOptions>,
    depth: number
  ): string {
    const indent = options.pretty ? this.getIndent(options.indent, depth) : '';
    const newLine = options.pretty ? '\n' : '';
    
    let html = indent + '<' + node.name;
    
    // Add attributes
    for (const [name, value] of Object.entries(node.attributes)) {
      html += this.serializeAttribute(name, value, options);
    }
    
    // Self-closing tag
    if (node.selfClosing && (!node.children || node.children.length === 0)) {
      html += options.xhtml ? ' />' : '>';
      return html + newLine;
    }
    
    html += '>';
    
    // Handle special case for <pre> elements (preserve whitespace)
    const preserveWhitespace = node.name === 'pre' || node.name === 'code';
    
    // Add children
    if (node.children && node.children.length > 0) {
      const childDepth = depth + 1;
      const hasNonTextChildren = node.children.some(child => !isTextNode(child));
      
      // Add newline after opening tag if we have non-text children and pretty printing is enabled
      if (hasNonTextChildren && options.pretty && !preserveWhitespace) {
        html += newLine;
      }
      
      // Serialize children
      for (const child of node.children) {
        if (preserveWhitespace || !options.pretty || !hasNonTextChildren) {
          html += this.serializeNode(child, { ...options, pretty: false }, childDepth);
        } else {
          html += this.serializeNode(child, options, childDepth);
        }
      }
      
      // Add indentation before closing tag if we have non-text children and pretty printing is enabled
      if (hasNonTextChildren && options.pretty && !preserveWhitespace) {
        html += indent;
      }
    }
    
    // Closing tag
    html += '</' + node.name + '>';
    
    return html + newLine;
  }
  
  /**
   * Serialize a text node to an HTML string.
   * 
   * @param node Text node to serialize
   * @param options Serialization options
   * @returns HTML string
   */
  private serializeText(
    node: TextNode,
    options: Required<SerializeOptions>
  ): string {
    if (options.encodeEntities) {
      return this.encodeHtmlEntities(node.value);
    }
    
    return node.value;
  }
  
  /**
   * Serialize a comment node to an HTML string.
   * 
   * @param node Comment node to serialize
   * @param options Serialization options
   * @param depth Current indentation depth
   * @returns HTML string
   */
  private serializeComment(
    node: CommentNode,
    options: Required<SerializeOptions>,
    depth: number
  ): string {
    const indent = options.pretty ? this.getIndent(options.indent, depth) : '';
    const newLine = options.pretty ? '\n' : '';
    
    return indent + '<!--' + node.value + '-->' + newLine;
  }
  
  /**
   * Serialize an HTML attribute.
   * 
   * @param name Attribute name
   * @param value Attribute value
   * @param options Serialization options
   * @returns HTML attribute string
   */
  private serializeAttribute(
    name: string,
    value: string,
    options: Required<SerializeOptions>
  ): string {
    // Handle boolean attributes and empty values
    if ((value === '' || value === name) && options.minimizeEmptyAttributes) {
      return ' ' + name;
    }
    
    // Encode entities in attribute values
    const encodedValue = options.encodeEntities
      ? this.encodeHtmlEntities(value)
      : value;
    
    return ' ' + name + '="' + encodedValue + '"';
  }
  
  /**
   * Get indentation string.
   * 
   * @param indentChar Indentation character or string
   * @param depth Current indentation depth
   * @returns Indentation string
   */
  private getIndent(indentChar: string, depth: number): string {
    return indentChar.repeat(depth);
  }
  
  /**
   * Encode HTML entities.
   * 
   * @param text Text to encode
   * @returns Encoded text
   */
  private encodeHtmlEntities(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
