/**
 * Block element markdown rendering
 * Handles rendering of block-level elements like paragraphs, headings, lists, etc.
 */

import { ASTNode, isParentNode, hasAncestor } from '../../ast/types.js';
import { MarkdownRenderer } from './base.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Block element renderer that implements block-specific rendering methods
 */
export abstract class BlockRenderer extends MarkdownRenderer {
  /**
   * Renders a paragraph node
   * @param node Paragraph node
   * @returns Markdown string
   */
  protected renderParagraph(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    
    // Special handling for paragraphs in list items - don't add extra newlines
    if (hasAncestor(node, 'ListItem')) {
      return `${this.renderNodes(node.children)}\n`;
    }
    
    return `${this.renderNodes(node.children)}\n\n`;
  }
  
  /**
   * Renders a heading node
   * @param node Heading node
   * @returns Markdown string
   */
  protected renderHeading(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const headingNode = node as any;
    const level = headingNode.level;
    
    // Get heading style from options
    const style = this.options.headingStyle || 'atx';
    
    if (style === 'atx') {
      // ATX-style heading: # Heading
      const prefix = '#'.repeat(level);
      return `${prefix} ${this.renderNodes(headingNode.children)}\n\n`;
    } else if (style === 'atx-closed') {
      // ATX-closed style heading: # Heading #
      const prefix = '#'.repeat(level);
      const suffix = prefix;
      return `${prefix} ${this.renderNodes(headingNode.children)} ${suffix}\n\n`;
    } else {
      // Setext style (only supports level 1-2)
      if (level === 1) {
        return `${this.renderNodes(headingNode.children)}\n${'='.repeat(20)}\n\n`;
      } else if (level === 2) {
        return `${this.renderNodes(headingNode.children)}\n${'-'.repeat(20)}\n\n`;
      } else {
        // Fall back to ATX for levels 3+
        const prefix = '#'.repeat(level);
        return `${prefix} ${this.renderNodes(headingNode.children)}\n\n`;
      }
    }
  }
  
  /**
   * Renders a list node
   * @param node List node
   * @param listLevel Current list nesting level
   * @returns Markdown string
   */
  protected renderList(node: ASTNode, listLevel: number): string {
    if (!isParentNode(node)) return '';
    const listNode = node as any;
    
    // Check if this is an ordered list
    const isOrdered = listNode.ordered === true;
    
    debugLog(`Rendering list: ordered=${isOrdered}, items=${listNode.children.length}`, "info");
    
    // Process each list item
    const items = listNode.children.map((item: ASTNode) => {
      // Make sure we're only processing list items
      if (item.type !== 'ListItem') {
        debugLog(`Expected ListItem but got ${item.type} in List`, "warn");
        return this.renderNode(item, listLevel + 1);
      }
      
      // Pass the list type information to the list item renderer
      return this.renderListItem(item, listLevel + 1, isOrdered);
    }).join('');
    
    // Add an extra newline after nested lists
    const suffix = listLevel > 0 ? '\n' : '';
    
    return `${items}${suffix}`;
  }
  
  /**
   * Renders a list item node
   * @param node List item node
   * @param listLevel Current list nesting level
   * @param isOrdered Whether the parent list is ordered
   * @returns Markdown string
   */
  protected renderListItem(node: ASTNode, listLevel: number, isOrdered: boolean = false): string {
    if (!isParentNode(node)) return '';
    const itemNode = node as any;
    
    debugLog(`Rendering list item at level ${listLevel}, ordered=${isOrdered}`, "info");
    
    // Determine indentation based on list level
    const indent = ' '.repeat((listLevel - 1) * (this.options.indentSize || 2));
    
    // Get the bullet marker or ordered list marker based on the isOrdered parameter
    let marker;
    if (isOrdered) {
      marker = this.options.orderedMarker || '1.';
      debugLog(`Using ordered marker: ${marker}`, "info");
    } else {
      marker = this.options.bulletMarker || '-';
      debugLog(`Using bullet marker: ${marker}`, "info");
    }
    
    // Check if this is a task item
    let taskMarker = '';
    if (itemNode.checked !== null) {
      taskMarker = itemNode.checked ? '[x] ' : '[ ] ';
    }
    
    // Render the content
    const contentIndent = ' '.repeat((listLevel) * (this.options.indentSize || 2));
    
    // Join the children with proper indentation
    let content = '';
    
    if (isParentNode(node)) {
      content = itemNode.children.map((child: ASTNode, index: number) => {
        const childContent = this.renderNode(child, listLevel);
        
        // Apply proper indentation for block elements except first paragraph
        if (child.type !== 'Paragraph' || index > 0) {
          return childContent.replace(/^/gm, contentIndent);
        }
        
        return childContent;
      }).join('');
    }
    
    // Remove excessive newlines and ensure proper formatting
    content = content.trimEnd();
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    return `${indent}${marker} ${taskMarker}${content}`;
  }
  
  /**
   * Renders a code block node
   * @param node Code block node
   * @returns Markdown string
   */
  protected renderCodeBlock(node: ASTNode): string {
    const codeNode = node as any;
    
    const fence = this.options.fencedCodeMarker || '```';
    const language = codeNode.language || '';
    const value = codeNode.value;
    
    return `${fence}${language}\n${value}\n${fence}\n\n`;
  }
  
  /**
   * Renders a blockquote node
   * @param node Blockquote node
   * @returns Markdown string
   */
  protected renderBlockquote(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    
    // Render the content
    const content = this.renderNodes(node.children);
    
    // Add the blockquote marker to each line
    const blockquoted = content.replace(/^/gm, '> ');
    
    return `${blockquoted}\n`;
  }
  
  /**
   * Renders a thematic break node
   * @returns Markdown string
   */
  protected renderThematicBreak(): string {
    const marker = this.options.thematicBreakMarker || '---';
    return `${marker}\n\n`;
  }
  
  /**
   * Renders an HTML node
   * @param node HTML node
   * @returns Markdown string
   */
  protected renderHtml(node: ASTNode): string {
    const htmlNode = node as any;
    return `${htmlNode.value}\n\n`;
  }
}