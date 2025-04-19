/**
 * Inline element markdown rendering
 * Handles rendering of inline elements like text, emphasis, links, etc.
 */

import { ASTNode, isParentNode } from '../../ast/types.js';
import { MarkdownRenderer } from './base.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Inline element renderer that implements inline-specific rendering methods
 */
export abstract class InlineRenderer extends MarkdownRenderer {
  /**
   * Renders a text node
   * @param node Text node
   * @returns Markdown string
   */
  protected renderText(node: ASTNode): string {
    const textNode = node as any;
    return textNode.value;
  }
  
  /**
   * Renders an emphasis node
   * @param node Emphasis node
   * @returns Markdown string
   */
  protected renderEmphasis(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const delimiter = this.options.emphasisDelimiter || '*';
    return `${delimiter}${this.renderNodes(node.children)}${delimiter}`;
  }
  
  /**
   * Renders a strong node
   * @param node Strong node
   * @returns Markdown string
   */
  protected renderStrong(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const delimiter = this.options.strongDelimiter || '**';
    return `${delimiter}${this.renderNodes(node.children)}${delimiter}`;
  }
  
  /**
   * Renders an inline code node
   * @param node Inline code node
   * @returns Markdown string
   */
  protected renderInlineCode(node: ASTNode): string {
    const codeNode = node as any;
    // Use multiple backticks if the content contains backticks
    const hasBacktick = codeNode.value.includes('`');
    const fence = hasBacktick ? '``' : '`';
    const padding = hasBacktick ? ' ' : '';
    
    return `${fence}${padding}${codeNode.value}${padding}${fence}`;
  }
  
  /**
   * Renders a link node
   * @param node Link node
   * @returns Markdown string
   */
  protected renderLink(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const linkNode = node as any;
    
    const text = this.renderNodes(linkNode.children);
    const url = linkNode.url;
    const title = linkNode.title;
    
    if (title) {
      return `[${text}](${url} "${title}")`;
    } else {
      return `[${text}](${url})`;
    }
  }
  
  /**
   * Renders an image node
   * @param node Image node
   * @returns Markdown string
   */
  protected renderImage(node: ASTNode): string {
    debugLog("Rendering image node", "info", node);
    
    const imageNode = node as any;
    
    // Ensure the image node has the required properties
    if (!imageNode || typeof imageNode.url !== 'string') {
      debugLog("Invalid image node: missing url property", "warn", imageNode);
      return '';
    }
    
    const alt = imageNode.alt || '';
    const url = imageNode.url;
    const title = imageNode.title;
    
    debugLog(`Image properties: url=${url}, alt=${alt}, title=${title}`, "info");
    
    if (title) {
      return `![${alt}](${url} "${title}")`;
    } else {
      return `![${alt}](${url})`;
    }
  }
  
  /**
   * Renders a break node
   * @param node Break node
   * @returns Markdown string
   */
  protected renderBreak(node: ASTNode): string {
    const breakNode = node as any;
    
    if (breakNode.hard) {
      // Hard break: two spaces and a newline
      return '  \n';
    } else {
      // Soft break: options-defined character
      return this.options.softBreak === 'newline' ? '\n' : ' ';
    }
  }
  
  /**
   * Renders a strikethrough node
   * @param node Strikethrough node
   * @returns Markdown string
   */
  protected renderStrikethrough(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    return `~~${this.renderNodes(node.children)}~~`;
  }
  
  /**
   * Renders a footnote reference node
   * @param node Footnote reference node
   * @returns Markdown string
   */
  protected renderFootnoteReference(node: ASTNode): string {
    const footnoteNode = node as any;
    const label = footnoteNode.label || footnoteNode.identifier;
    
    return `[^${label}]`;
  }
  
  /**
   * Renders a footnote definition node
   * @param node Footnote definition node
   * @returns Markdown string
   */
  protected renderFootnoteDefinition(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const footnoteNode = node as any;
    
    const label = footnoteNode.label || footnoteNode.identifier;
    const content = this.renderNodes(footnoteNode.children);
    
    // Format the content with proper indentation
    const indentedContent = content.replace(/^/gm, '    ').trim();
    
    return `[^${label}]: ${indentedContent}\n\n`;
  }
}