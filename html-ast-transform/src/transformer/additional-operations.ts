import type {
  AstNode,
  ElementNode,
  TextNode,
  TransformOperation,
  TransformContext,
  isElementNode,
  isTextNode
} from '../types/index.js';

/**
 * Operation that sanitizes HTML by removing potentially unsafe elements and attributes.
 * Useful for cleaning up user-generated content.
 */
export class SanitizeHtmlOperation implements TransformOperation {
  name = 'sanitizeHtml';
  
  private unsafeElements: Set<string>;
  private unsafeAttributes: Set<string>;
  
  /**
   * Create a new sanitizer operation.
   * 
   * @param options Optional configuration options
   */
  constructor(options: {
    unsafeElements?: string[];
    unsafeAttributes?: string[];
  } = {}) {
    // Default unsafe elements
    this.unsafeElements = new Set([
      'script', 'style', 'iframe', 'object', 'embed', 'applet', 'param', 'base',
      'form', 'input', 'textarea', 'select', 'option', 'button', 'meta',
      ...(options.unsafeElements || [])
    ].map(tag => tag.toLowerCase()));
    
    // Default unsafe attributes
    this.unsafeAttributes = new Set([
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown',
      'onmouseup', 'onkeydown', 'onkeypress', 'onkeyup', 'onchange', 'onsubmit',
      'javascript:', 'data:', 'vbscript:',
      ...(options.unsafeAttributes || [])
    ]);
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) || isTextNode(node);
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    // Handle element nodes
    if (isElementNode(node)) {
      const elementNode = node;
      const tagName = elementNode.name.toLowerCase();
      
      // Remove unsafe elements
      if (this.unsafeElements.has(tagName)) {
        return null;
      }
      
      // Clean attributes
      const newAttributes: Record<string, string> = {};
      
      for (const [name, value] of Object.entries(elementNode.attributes)) {
        // Skip unsafe attributes
        if (this.unsafeAttributes.has(name.toLowerCase())) {
          continue;
        }
        
        // Check for unsafe values in URLs
        if (['href', 'src', 'action'].includes(name.toLowerCase())) {
          const lowerValue = value.toLowerCase();
          
          // Skip attributes with unsafe URL schemes
          if (
            lowerValue.startsWith('javascript:') ||
            lowerValue.startsWith('data:') ||
            lowerValue.startsWith('vbscript:')
          ) {
            continue;
          }
        }
        
        // Keep safe attribute
        newAttributes[name] = value;
      }
      
      return {
        ...elementNode,
        attributes: newAttributes
      };
    }
    
    // Handle text nodes (can check for XSS patterns if needed)
    if (isTextNode(node)) {
      return node;
    }
    
    return node;
  }
}

/**
 * Operation that adds target="_blank" and rel="noopener noreferrer" to external links.
 * Useful for improving security of links.
 */
export class SecureExternalLinksOperation implements TransformOperation {
  name = 'secureExternalLinks';
  
  private internalDomains: Set<string>;
  
  /**
   * Create a new secure external links operation.
   * 
   * @param internalDomains Array of domains to be considered "internal"
   */
  constructor(internalDomains: string[] = []) {
    this.internalDomains = new Set(internalDomains);
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && node.name.toLowerCase() === 'a' && 'href' in node.attributes;
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const anchorNode = node as ElementNode;
    const href = anchorNode.attributes.href;
    
    // Skip links without href or with non-http schemes
    if (!href || !href.match(/^https?:\/\//i)) {
      return node;
    }
    
    try {
      const url = new URL(href);
      const hostname = url.hostname;
      
      // Check if the link is external
      if (!this.internalDomains.has(hostname)) {
        // Add secure attributes to external links
        return {
          ...anchorNode,
          attributes: {
            ...anchorNode.attributes,
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        };
      }
    } catch (error) {
      // Invalid URL, return unchanged
    }
    
    return node;
  }
}

/**
 * Operation that converts relative URLs to absolute URLs.
 * Useful for content that will be displayed in a different context.
 */
export class AbsoluteUrlsOperation implements TransformOperation {
  name = 'absoluteUrls';
  
  private baseUrl: string;
  private urlAttributes: Set<string>;
  
  /**
   * Create a new absolute URLs operation.
   * 
   * @param baseUrl Base URL to use for resolving relative URLs
   * @param options Optional configuration options
   */
  constructor(baseUrl: string, options: {
    urlAttributes?: string[];
  } = {}) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    
    // Default URL attributes
    this.urlAttributes = new Set([
      'href', 'src', 'action', 'data', 'poster',
      ...(options.urlAttributes || [])
    ]);
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node);
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const elementNode = node as ElementNode;
    const newAttributes: Record<string, string> = { ...elementNode.attributes };
    let changed = false;
    
    for (const [name, value] of Object.entries(elementNode.attributes)) {
      if (this.urlAttributes.has(name) && value && !value.match(/^(https?:\/\/|data:|mailto:|tel:)/i)) {
        // Convert relative URL to absolute
        if (value.startsWith('/')) {
          // Absolute path
          const baseUrlObj = new URL(this.baseUrl);
          newAttributes[name] = `${baseUrlObj.origin}${value}`;
        } else {
          // Relative path
          newAttributes[name] = new URL(value, this.baseUrl).toString();
        }
        changed = true;
      }
    }
    
    if (changed) {
      return {
        ...elementNode,
        attributes: newAttributes
      };
    }
    
    return node;
  }
}

/**
 * Operation that adds CSS classes to elements based on a predicate.
 * Useful for adding styling hooks to specific elements.
 */
export class AddClassOperation implements TransformOperation {
  name = 'addClass';
  
  private className: string;
  private selector: (node: ElementNode) => boolean;
  
  /**
   * Create a new add class operation.
   * 
   * @param className Class name to add
   * @param selector Function that returns true for elements that should receive the class
   */
  constructor(className: string, selector: (node: ElementNode) => boolean) {
    this.className = className;
    this.selector = selector;
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && this.selector(node as ElementNode);
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const elementNode = node as ElementNode;
    const currentClasses = elementNode.attributes.class ? elementNode.attributes.class.split(/\s+/) : [];
    
    // Check if class already exists
    if (currentClasses.includes(this.className)) {
      return node;
    }
    
    // Add the class
    currentClasses.push(this.className);
    
    return {
      ...elementNode,
      attributes: {
        ...elementNode.attributes,
        class: currentClasses.join(' ')
      }
    };
  }
}

/**
 * Operation that wraps elements matching a predicate with a new parent element.
 * Useful for adding containers around specific elements.
 */
export class WrapElementsOperation implements TransformOperation {
  name = 'wrapElements';
  
  private wrapperTag: string;
  private wrapperAttributes: Record<string, string>;
  private selector: (node: ElementNode) => boolean;
  
  /**
   * Create a new wrap elements operation.
   * 
   * @param wrapperTag Tag name for the wrapper element
   * @param selector Function that returns true for elements that should be wrapped
   * @param wrapperAttributes Attributes for the wrapper element
   */
  constructor(
    wrapperTag: string,
    selector: (node: ElementNode) => boolean,
    wrapperAttributes: Record<string, string> = {}
  ) {
    this.wrapperTag = wrapperTag;
    this.selector = selector;
    this.wrapperAttributes = wrapperAttributes;
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && this.selector(node as ElementNode);
  }
  
  transform(node: AstNode, context: TransformContext): AstNode | null {
    // Skip if already wrapped (parent has been processed)
    if (
      context.path.length > 1 &&
      isElementNode(context.path[context.path.length - 2]) &&
      (context.path[context.path.length - 2] as ElementNode).name.toLowerCase() === this.wrapperTag.toLowerCase()
    ) {
      return node;
    }
    
    // Create wrapper element
    const wrapper: ElementNode = {
      type: 'element',
      name: this.wrapperTag.toLowerCase(),
      attributes: { ...this.wrapperAttributes },
      children: [structuredClone(node)],
      selfClosing: false
    };
    
    // Update parent reference in the wrapped node
    if (wrapper.children[0]) {
      wrapper.children[0].parent = wrapper;
    }
    
    return wrapper;
  }
}

/**
 * Operation that unwraps elements, replacing them with their children.
 * Useful for removing unnecessary container elements.
 */
export class UnwrapElementsOperation implements TransformOperation {
  name = 'unwrapElements';
  
  private selector: (node: ElementNode) => boolean;
  
  /**
   * Create a new unwrap elements operation.
   * 
   * @param selector Function that returns true for elements that should be unwrapped
   */
  constructor(selector: (node: ElementNode) => boolean) {
    this.selector = selector;
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && this.selector(node as ElementNode);
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const elementNode = node as ElementNode;
    
    // If no children, simply remove the element
    if (!elementNode.children || elementNode.children.length === 0) {
      return null;
    }
    
    // Unwrap multiple children
    if (elementNode.children.length > 1) {
      // We can't directly return multiple nodes in the transform function
      // Instead, we'll keep the first child and add its siblings to the parent
      // after the current node in the transformer's traversal
      
      // Store in context for post-processing (would need to be implemented in transformer)
      // For now, we'll just return the first child
      return elementNode.children[0];
    }
    
    // Unwrap single child
    return elementNode.children[0];
  }
}

/**
 * Operation that adds heading IDs based on their content.
 * Useful for creating anchor links to headings.
 */
export class AddHeadingIdsOperation implements TransformOperation {
  name = 'addHeadingIds';
  
  private prefix: string;
  private usedIds: Set<string>;
  
  /**
   * Create a new add heading IDs operation.
   * 
   * @param options Optional configuration options
   */
  constructor(options: {
    prefix?: string;
  } = {}) {
    this.prefix = options.prefix || 'heading-';
    this.usedIds = new Set();
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && /^h[1-6]$/i.test(node.name);
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const headingNode = node as ElementNode;
    
    // Skip if heading already has an ID
    if (headingNode.attributes.id) {
      return node;
    }
    
    // Get heading text content
    const textContent = this.getTextContent(headingNode);
    
    // Generate ID from text content
    let id = this.generateId(textContent);
    
    // Add the ID to the heading
    return {
      ...headingNode,
      attributes: {
        ...headingNode.attributes,
        id
      }
    };
  }
  
  /**
   * Get text content from a node and its descendants.
   */
  private getTextContent(node: AstNode): string {
    if (isTextNode(node)) {
      return node.value;
    }
    
    if (!node.children) {
      return '';
    }
    
    return node.children
      .map(child => this.getTextContent(child))
      .join('');
  }
  
  /**
   * Generate an ID from text content.
   */
  private generateId(text: string): string {
    // Convert to lowercase and replace non-alphanumeric characters with hyphens
    let id = this.prefix + text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure ID is unique
    let uniqueId = id;
    let counter = 1;
    
    while (this.usedIds.has(uniqueId)) {
      uniqueId = `${id}-${counter}`;
      counter++;
    }
    
    // Store the ID
    this.usedIds.add(uniqueId);
    
    return uniqueId;
  }
}
