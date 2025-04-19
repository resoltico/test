/**
 * Base Markdown renderer
 * Defines the core renderer class and main rendering logic
 */

import { ASTNode, isParentNode } from '../../ast/types.js';
import { RenderOptions, DEFAULT_OPTIONS } from '../options.js';
import { RenderError } from '../../utils/errors.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Base Markdown renderer class
 * Defines abstract methods that subclasses must implement
 */
export abstract class MarkdownRenderer {
  protected options: RenderOptions;
  
  /**
   * Creates a new markdown renderer
   * @param options Render options
   */
  constructor(options: RenderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Renders an AST as markdown
   * @param ast The AST to render
   * @returns Markdown string
   */
  public render(ast: ASTNode[]): string {
    return this.renderNodes(ast);
  }
  
  /**
   * Renders an array of AST nodes
   * @param nodes The nodes to render
   * @param listLevel The current list nesting level
   * @returns Markdown string
   */
  protected renderNodes(nodes: ASTNode[], listLevel: number = 0): string {
    return nodes.map(node => this.renderNode(node, listLevel)).join('');
  }
  
  /**
   * Renders a single AST node
   * @param node The node to render
   * @param listLevel The current list nesting level
   * @returns Markdown string
   */
  protected renderNode(node: ASTNode, listLevel: number = 0): string {
    debugLog(`Rendering node of type: ${node.type}`, "info");
    
    switch (node.type) {
      case 'Document':
        return this.renderDocument(node);
      case 'Paragraph':
        return this.renderParagraph(node);
      case 'Heading':
        return this.renderHeading(node);
      case 'Text':
        return this.renderText(node);
      case 'Emphasis':
        return this.renderEmphasis(node);
      case 'Strong':
        return this.renderStrong(node);
      case 'InlineCode':
        return this.renderInlineCode(node);
      case 'Link':
        return this.renderLink(node);
      case 'Image':
        return this.renderImage(node);
      case 'List':
        return this.renderList(node, listLevel);
      case 'ListItem':
        return this.renderListItem(node, listLevel);
      case 'CodeBlock':
        return this.renderCodeBlock(node);
      case 'Blockquote':
        return this.renderBlockquote(node);
      case 'ThematicBreak':
        return this.renderThematicBreak();
      case 'HTML':
        return this.renderHtml(node);
      case 'Break':
        return this.renderBreak(node);
      case 'Table':
        return this.renderTable(node);
      case 'TableRow':
        return this.renderTableRow(node);
      case 'TableCell':
        return this.renderTableCell(node);
      case 'Strikethrough':
        return this.renderStrikethrough(node);
      case 'FootnoteDefinition':
        return this.renderFootnoteDefinition(node);
      case 'FootnoteReference':
        return this.renderFootnoteReference(node);
      default:
        throw new RenderError(`Unknown node type: ${(node as any).type}`, {
          nodeType: (node as any).type,
        });
    }
  }
  
  /**
   * Renders a document node
   * @param node Document node
   * @returns Markdown string
   */
  protected renderDocument(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    return this.renderNodes(node.children);
  }
  
  /**
   * Abstract methods that must be implemented by subclasses
   */
  protected abstract renderParagraph(node: ASTNode): string;
  protected abstract renderHeading(node: ASTNode): string;
  protected abstract renderText(node: ASTNode): string;
  protected abstract renderEmphasis(node: ASTNode): string;
  protected abstract renderStrong(node: ASTNode): string;
  protected abstract renderInlineCode(node: ASTNode): string;
  protected abstract renderLink(node: ASTNode): string;
  protected abstract renderImage(node: ASTNode): string;
  protected abstract renderList(node: ASTNode, listLevel: number): string;
  protected abstract renderListItem(node: ASTNode, listLevel: number, isOrdered?: boolean): string;
  protected abstract renderCodeBlock(node: ASTNode): string;
  protected abstract renderBlockquote(node: ASTNode): string;
  protected abstract renderThematicBreak(): string;
  protected abstract renderHtml(node: ASTNode): string;
  protected abstract renderBreak(node: ASTNode): string;
  protected abstract renderTable(node: ASTNode): string;
  protected abstract renderTableRow(node: ASTNode, columnWidths?: number[]): string;
  protected abstract renderTableCell(node: ASTNode): string;
  protected abstract renderStrikethrough(node: ASTNode): string;
  protected abstract renderFootnoteDefinition(node: ASTNode): string;
  protected abstract renderFootnoteReference(node: ASTNode): string;
  
  /**
   * Placeholder method for any pre-processing needed before rendering
   * @param ast The AST to pre-process
   * @returns The processed AST
   */
  protected preProcess(ast: ASTNode[]): ASTNode[] {
    // Default implementation does nothing
    return ast;
  }
  
  /**
   * Placeholder method for any post-processing needed after rendering
   * @param markdown The rendered markdown
   * @returns The processed markdown
   */
  protected postProcess(markdown: string): string {
    // Default implementation does nothing
    return markdown;
  }
}