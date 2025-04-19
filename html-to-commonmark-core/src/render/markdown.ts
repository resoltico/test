/**
 * Markdown renderer
 * Renders an AST as CommonMark-compatible markdown with parent context awareness
 */

import { ASTNode, isParentNode, hasAncestor } from '../ast/types.js';
import { RenderOptions, DEFAULT_OPTIONS } from './options.js';
import { RenderError } from '../utils/errors.js';
import { debugLog } from '../utils/debug.js';

/**
 * Renders an AST as markdown
 * @param ast The AST to render
 * @param options Render options
 * @returns Markdown string
 */
export function renderMarkdown(ast: ASTNode[], options: RenderOptions = {}): string {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    debugLog("Rendering markdown with options", "info", mergedOptions);
    
    const renderer = new MarkdownRenderer(mergedOptions);
    return renderer.render(ast);
  } catch (error) {
    throw new RenderError('Failed to render markdown', {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

/**
 * Markdown renderer class
 */
class MarkdownRenderer {
  private options: RenderOptions;
  
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
  private renderNodes(nodes: ASTNode[], listLevel: number = 0): string {
    return nodes.map(node => this.renderNode(node, listLevel)).join('');
  }
  
  /**
   * Renders a single AST node
   * @param node The node to render
   * @param listLevel The current list nesting level
   * @returns Markdown string
   */
  private renderNode(node: ASTNode, listLevel: number = 0): string {
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
  private renderDocument(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    return this.renderNodes(node.children);
  }
  
  /**
   * Renders a paragraph node
   * @param node Paragraph node
   * @returns Markdown string
   */
  private renderParagraph(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    
    // Special handling for paragraphs in list items
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
  private renderHeading(node: ASTNode): string {
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
   * Renders a text node
   * @param node Text node
   * @returns Markdown string
   */
  private renderText(node: ASTNode): string {
    const textNode = node as any;
    return textNode.value;
  }
  
  /**
   * Renders an emphasis node
   * @param node Emphasis node
   * @returns Markdown string
   */
  private renderEmphasis(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const delimiter = this.options.emphasisDelimiter || '*';
    return `${delimiter}${this.renderNodes(node.children)}${delimiter}`;
  }
  
  /**
   * Renders a strong node
   * @param node Strong node
   * @returns Markdown string
   */
  private renderStrong(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const delimiter = this.options.strongDelimiter || '**';
    return `${delimiter}${this.renderNodes(node.children)}${delimiter}`;
  }
  
  /**
   * Renders an inline code node
   * @param node Inline code node
   * @returns Markdown string
   */
  private renderInlineCode(node: ASTNode): string {
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
  private renderLink(node: ASTNode): string {
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
  private renderImage(node: ASTNode): string {
    debugLog("Rendering image node", "info", node);
    
    const imageNode = node as any;
    
    // Ensure the image node has the required properties
    if (!imageNode || !imageNode.url) {
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
   * Renders a list node
   * @param node List node
   * @param listLevel Current list nesting level
   * @returns Markdown string
   */
  private renderList(node: ASTNode, listLevel: number): string {
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
  private renderListItem(node: ASTNode, listLevel: number, isOrdered: boolean = false): string {
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
    
    // Trim trailing whitespace and ensure a single newline at the end
    content = content.replace(/\s+$/, '\n');
    
    return `${indent}${marker} ${taskMarker}${content}`;
  }
  
  /**
   * Renders a code block node
   * @param node Code block node
   * @returns Markdown string
   */
  private renderCodeBlock(node: ASTNode): string {
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
  private renderBlockquote(node: ASTNode): string {
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
  private renderThematicBreak(): string {
    const marker = this.options.thematicBreakMarker || '---';
    return `${marker}\n\n`;
  }
  
  /**
   * Renders an HTML node
   * @param node HTML node
   * @returns Markdown string
   */
  private renderHtml(node: ASTNode): string {
    const htmlNode = node as any;
    return `${htmlNode.value}\n\n`;
  }
  
  /**
   * Renders a break node
   * @param node Break node
   * @returns Markdown string
   */
  private renderBreak(node: ASTNode): string {
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
   * Renders a table node
   * @param node Table node
   * @returns Markdown string
   */
  private renderTable(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const tableNode = node as any;
    
    debugLog(`Rendering table with ${tableNode.children.length} rows`, "info");
    
    // Get alignment information
    const aligns = tableNode.align || [];
    
    // Process rows
    const rows = tableNode.children;
    
    if (rows.length === 0) {
      return '';
    }
    
    // Calculate column widths based on content
    const columnWidths: number[] = [];
    let maxColumns = 0;
    
    // First pass to determine max column count
    for (const row of rows) {
      if (!isParentNode(row)) continue;
      maxColumns = Math.max(maxColumns, row.children.length);
      debugLog(`Row has ${row.children.length} cells`, "info");
    }
    
    debugLog(`Table has ${maxColumns} columns maximum`, "info");
    
    // Initialize column widths
    for (let i = 0; i < maxColumns; i++) {
      columnWidths.push(3); // Minimum width of 3 for separator row
    }
    
    // Make sure we have enough columns in the align array
    while (aligns.length < maxColumns) {
      aligns.push(null);
    }
    
    // Second pass to calculate column widths
    for (const row of rows) {
      if (!isParentNode(row)) continue;
      
      const cells = row.children;
      for (let i = 0; i < cells.length; i++) {
        // Safely render the cell content
        const cellContent = this.renderNode(cells[i], 0).trim();
        const cellWidth = cellContent.length;
        
        if (columnWidths[i] === undefined || cellWidth > columnWidths[i]) {
          columnWidths[i] = cellWidth;
        }
      }
    }
    
    debugLog(`Calculated column widths: ${JSON.stringify(columnWidths)}`, "info");
    
    // Render each row
    let result = '';
    
    // Header row (first row)
    if (rows.length > 0 && isParentNode(rows[0])) {
      result += this.renderTableRow(rows[0] as ASTNode, columnWidths) + '\n';
      
      // Alignment/separator row
      const separators = columnWidths.map((width, index) => {
        const align = aligns[index];
        
        if (align === 'left') {
          return `:${'-'.repeat(Math.max(width - 1, 2))}`;
        } else if (align === 'right') {
          return `${'-'.repeat(Math.max(width - 1, 2))}:`;
        } else if (align === 'center') {
          return `:${'-'.repeat(Math.max(width - 2, 1))}:`;
        } else {
          return '-'.repeat(Math.max(width, 3));
        }
      });
      
      result += `| ${separators.join(' | ')} |\n`;
      
      // Data rows
      for (let i = 1; i < rows.length; i++) {
        if (isParentNode(rows[i])) {
          result += this.renderTableRow(rows[i] as ASTNode, columnWidths) + '\n';
        }
      }
      
      result += '\n';
    }
    
    return result;
  }
  
  /**
   * Renders a table row node
   * @param node Table row node
   * @param columnWidths Column widths
   * @returns Markdown string
   */
  private renderTableRow(node: ASTNode, columnWidths: number[] = []): string {
    if (!isParentNode(node)) return '';
    
    debugLog(`Rendering table row with ${node.children.length} cells`, "info");
    
    // Get cells
    const cells = node.children;
    const cellsToRender = [];
    
    // Ensure we're working with an array of cells
    if (!Array.isArray(cells)) {
      debugLog('Expected array of cells but got:', "warn", cells);
      return '| |';
    }
    
    // Render each cell
    for (let i = 0; i < columnWidths.length; i++) {
      let content = '';
      
      if (i < cells.length) {
        content = this.renderTableCell(cells[i]).trim();
      }
      
      // Pad to column width
      const width = columnWidths[i] || 3;
      
      // Get alignment if available
      let align = null;
      if (node.parent && 'align' in node.parent && Array.isArray(node.parent.align)) {
        align = node.parent.align[i];
      }
      
      if (align === 'right') {
        content = ' '.repeat(Math.max(0, width - content.length)) + content;
      } else if (align === 'center') {
        const leftPad = Math.floor((width - content.length) / 2);
        const rightPad = Math.ceil((width - content.length) / 2);
        content = ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
      } else {
        content = content + ' '.repeat(Math.max(0, width - content.length));
      }
      
      cellsToRender.push(content);
    }
    
    return `| ${cellsToRender.join(' | ')} |`;
  }
  
  /**
   * Renders a table cell node
   * @param node Table cell node
   * @returns Markdown string
   */
  private renderTableCell(node: ASTNode): string {
    debugLog(`Rendering table cell of type ${node.type}`, "info");
    
    if (!isParentNode(node)) {
      // If not a parent node, convert to string safely
      return String((node as any).value || '');
    }
    
    // Render the content of the cell
    const content = this.renderNodes(node.children);
    
    // Escape pipes in cell content if configured
    if (this.options.escapePipeInTables) {
      return content.replace(/\|/g, '\\|');
    }
    
    return content;
  }
  
  /**
   * Renders a strikethrough node
   * @param node Strikethrough node
   * @returns Markdown string
   */
  private renderStrikethrough(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    return `~~${this.renderNodes(node.children)}~~`;
  }
  
  /**
   * Renders a footnote definition node
   * @param node Footnote definition node
   * @returns Markdown string
   */
  private renderFootnoteDefinition(node: ASTNode): string {
    if (!isParentNode(node)) return '';
    const footnoteNode = node as any;
    
    const label = footnoteNode.label || footnoteNode.identifier;
    const content = this.renderNodes(footnoteNode.children);
    
    // Format the content with proper indentation
    const indentedContent = content.replace(/^/gm, '    ').trim();
    
    return `[^${label}]: ${indentedContent}\n\n`;
  }
  
  /**
   * Renders a footnote reference node
   * @param node Footnote reference node
   * @returns Markdown string
   */
  private renderFootnoteReference(node: ASTNode): string {
    const footnoteNode = node as any;
    const label = footnoteNode.label || footnoteNode.identifier;
    
    return `[^${label}]`;
  }
}