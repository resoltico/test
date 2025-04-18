/**
 * DOM Walker module
 * Traverses HTML DOM and applies rules to convert to AST with proper relationships
 */

import { ASTNode, ParentNode } from '../ast/types.js';
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
}

/**
 * Default walker options
 */
const DEFAULT_OPTIONS: Partial<WalkerOptions> = {
  strictRules: false,
  preserveComments: false,
  establishRelationships: true,
  verifyRelationships: true,
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
        verifyRelationships([document]);
      }
    }
    
    return [document];
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
        // No rule found, fall back to default behavior
        return this.handleNoRule(node, parentNodeStack);
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
    return this.ruleMap.get(tagName.toUpperCase());
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