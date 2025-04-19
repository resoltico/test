/**
 * DOM Walker module
 * Traverses HTML DOM and applies rules to convert to AST with proper relationships
 */

import { ASTNode } from '../ast/types.js';
import { TagRule, RuleContext, createRuleContext } from '../rules/base.js';
import { ElementNode, HtmlNode, TextNode, isElementNode, isTextNode } from '../types/html.js';
import { RuleError } from '../utils/errors.js';
import * as builder from '../ast/builder.js';
import { defaultRuleMap } from '../rules/index.js';
import { establishRelationships, verifyRelationships } from '../ast/relationship.js';

/**
 * Options for the HTML walker
 */
export interface WalkerOptions {
  /**
   * Rule map for processing HTML tags
   */
  ruleMap: Map<string, TagRule>;
  
  /**
   * Whether to throw an error when no rule is found
   */
  strictRules?: boolean;
  
  /**
   * Default rule to use when no rule is found
   */
  defaultRule?: TagRule;
  
  /**
   * Whether to preserve comments
   */
  preserveComments?: boolean;
  
  /**
   * Whether to establish relationships after walking
   */
  establishRelationships?: boolean;
  
  /**
   * Whether to verify relationships after establishing them
   */
  verifyRelationships?: boolean;
  
  /**
   * Enable debugging output
   */
  debug?: boolean;
}

/**
 * Default walker options
 */
const DEFAULT_OPTIONS: Partial<WalkerOptions> = {
  strictRules: false,
  preserveComments: false,
  establishRelationships: true,
  verifyRelationships: true,
  debug: false
};

/**
 * Error thrown when a tag has no matching rule
 */
class NoRuleError extends Error {
  constructor(tagName: string) {
    super(`No rule found for tag: ${tagName}`);
    this.name = 'NoRuleError';
  }
}

/**
 * Default fallback rule that processes children
 */
const FALLBACK_RULE: TagRule = {
  tagName: '_DEFAULT_',
  emit(node: ElementNode, context: RuleContext): ASTNode[] {
    return context.renderChildrenAsAst(node);
  }
};

/**
 * Walks the HTML DOM and converts it to an AST
 */
export class Walker {
  private ruleMap: Map<string, TagRule>;
  private strictRules: boolean;
  private defaultRule: TagRule;
  private preserveComments: boolean;
  private doEstablishRelationships: boolean;
  private doVerifyRelationships: boolean;
  private isDebugEnabled: boolean;
  
  /**
   * Creates a new Walker
   * @param options Walker options
   */
  constructor(options: WalkerOptions) {
    this.ruleMap = options.ruleMap || defaultRuleMap;
    this.strictRules = options.strictRules ?? DEFAULT_OPTIONS.strictRules!;
    this.defaultRule = options.defaultRule || FALLBACK_RULE;
    this.preserveComments = options.preserveComments ?? DEFAULT_OPTIONS.preserveComments!;
    this.doEstablishRelationships = options.establishRelationships ?? DEFAULT_OPTIONS.establishRelationships!;
    this.doVerifyRelationships = options.verifyRelationships ?? DEFAULT_OPTIONS.verifyRelationships!;
    this.isDebugEnabled = options.debug ?? DEFAULT_OPTIONS.debug!;
    
    // Logging for debugging
    if (this.isDebugEnabled) {
      console.log(`Rule map contains ${this.ruleMap.size} rules`);
      for (const [tag, rule] of this.ruleMap.entries()) {
        console.log(`Registered rule for tag: ${tag}, rule: ${rule.tagName}`);
      }
    }
  }
  
  /**
   * Walks the HTML DOM and converts it to an AST
   * @param rootNode The root node to start walking from
   * @returns An array of AST nodes
   */
  public walk(rootNode: HtmlNode): ASTNode[] {
    // Create a document node to hold everything
    const document = builder.document();
    
    // Process all child nodes
    const childNodes = this.walkNode(rootNode, []);
    
    // Add children to document, establishing parent-child relationships
    for (const child of childNodes) {
      document.appendChild(child);
    }
    
    // Establish relationships throughout the AST if needed
    if (this.doEstablishRelationships) {
      establishRelationships([document]);
      
      // Verify relationships if needed
      if (this.doVerifyRelationships) {
        const valid = verifyRelationships([document]);
        if (!valid && this.isDebugEnabled) {
          console.error("Parent-child relationships are invalid after walking");
        }
      }
    }
    
    return [document];
  }
  
  /**
   * Validates that an AST node has all required properties based on its type
   * @param node The AST node to validate
   */
  private validateAstNode(node: ASTNode): void {
    // Only log validation errors if debug is enabled
    if (!this.isDebugEnabled) return;
    
    // Validate common properties
    if (!node.type) {
      console.error(`Node missing 'type' property:`, node);
    }
    
    // Type-specific validation
    switch (node.type) {
      case 'List':
        if (!('ordered' in node)) {
          console.error(`List node missing 'ordered' property:`, node);
          (node as any).ordered = false; // Add default value to fix
        }
        break;
        
      case 'Image':
        if (!('url' in node)) {
          console.error(`Image node missing 'url' property:`, node);
          (node as any).url = ''; // Add default value to fix
        }
        if (!('alt' in node)) {
          console.error(`Image node missing 'alt' property:`, node);
          (node as any).alt = ''; // Add default value to fix
        }
        break;
        
      case 'Link':
        if (!('url' in node)) {
          console.error(`Link node missing 'url' property:`, node);
          (node as any).url = ''; // Add default value to fix
        }
        break;
        
      case 'Table':
        if (!('align' in node)) {
          console.error(`Table node missing 'align' property:`, node);
          (node as any).align = []; // Add default value to fix
        }
        break;
    }
  }
  
  /**
   * Processes a single node
   * @param node The node to process
   * @param parentNodeStack Stack of parent nodes
   * @returns An array of AST nodes
   */
  private walkNode(node: HtmlNode, parentNodeStack: HtmlNode[]): ASTNode[] {
    // Skip comment nodes if not preserving comments
    if (node.nodeType === 'comment' && !this.preserveComments) {
      return [];
    }
    
    // Handle text nodes
    if (isTextNode(node)) {
      return this.processTextNode(node);
    }
    
    // Handle element nodes
    if (isElementNode(node)) {
      return this.processElementNode(node, parentNodeStack);
    }
    
    // Default: just walk children
    if ('childNodes' in node) {
      return this.walkChildren((node as ElementNode), parentNodeStack);
    }
    
    return [];
  }
  
  /**
   * Processes a text node
   * @param node The text node to process
   * @returns An array of AST nodes
   */
  private processTextNode(node: TextNode): ASTNode[] {
    if (!node.data.trim() && node.data.length === 0) {
      // Empty text node, return empty array
      return [];
    }
    
    return [builder.text(node.data)];
  }
  
  /**
   * Processes an element node
   * @param node The element node to process
   * @param parentNodeStack Stack of parent nodes
   * @returns An array of AST nodes
   */
  private processElementNode(node: ElementNode, parentNodeStack: HtmlNode[]): ASTNode[] {
    const tagName = node.tagName;
    
    try {
      // Look up the rule for this tag
      const rule = this.findRule(tagName);
      
      if (!rule) {
        if (this.isDebugEnabled) {
          console.log(`No rule found for tag: ${tagName}, using default rule`);
        }
        // No rule found, fall back to default behavior
        return this.handleNoRule(node, parentNodeStack);
      }
      
      if (this.isDebugEnabled) {
        console.log(`Found rule for tag: ${tagName}, rule: ${rule.tagName}`);
      }
      
      // Create a new context for this rule
      const context = createRuleContext(
        [...parentNodeStack, node],
        (childNode) => this.walkNode(childNode, [...parentNodeStack, node])
      );
      
      // Apply the rule
      const result = rule.emit(node, context);
      
      if (result === null) {
        // Rule intentionally skipped this node
        return [];
      }
      
      // If result is a single node, convert to array
      const resultNodes = Array.isArray(result) ? result : [result];
      
      // Validate resulting nodes if debug is enabled
      if (this.isDebugEnabled) {
        for (const node of resultNodes) {
          this.validateAstNode(node);
        }
      }
      
      return resultNodes;
    } catch (error) {
      if (error instanceof NoRuleError && !this.strictRules) {
        // Fall back to default handling
        return this.handleNoRule(node, parentNodeStack);
      }
      
      // Re-throw with more context
      throw new RuleError(`Error processing tag: ${tagName}`, {
        cause: error instanceof Error ? error : new Error(String(error)),
        tagName
      });
    }
  }
  
  /**
   * Walks the children of a node
   * @param node The parent node
   * @param parentNodeStack Stack of parent nodes
   * @returns An array of AST nodes
   */
  private walkChildren(node: ElementNode, parentNodeStack: HtmlNode[]): ASTNode[] {
    const results: ASTNode[] = [];
    
    for (const child of node.childNodes) {
      const childResults = this.walkNode(child, [...parentNodeStack, node]);
      results.push(...childResults);
    }
    
    return results;
  }
  
  /**
   * Finds a rule for a tag
   * @param tagName The tag name to find a rule for
   * @returns The rule, or undefined if not found
   */
  private findRule(tagName: string): TagRule | undefined {
    // Make sure we're looking up the tag in uppercase
    const upperTagName = tagName.toUpperCase();
    const rule = this.ruleMap.get(upperTagName);
    
    if (this.isDebugEnabled) {
      console.log(`Looking up rule for tag: ${upperTagName}, found: ${rule ? 'yes' : 'no'}`);
    }
    
    return rule;
  }
  
  /**
   * Handles the case where no rule is found for a tag
   * @param node The element node
   * @param parentNodeStack Stack of parent nodes
   * @returns An array of AST nodes
   */
  private handleNoRule(node: ElementNode, parentNodeStack: HtmlNode[]): ASTNode[] {
    // Always use the default rule
    const context = createRuleContext(
      [...parentNodeStack, node],
      (childNode) => this.walkNode(childNode, [...parentNodeStack, node])
    );
    
    const result = this.defaultRule.emit(node, context);
    
    if (result === null) {
      return [];
    }
    
    return Array.isArray(result) ? result : [result];
  }
}