/**
 * Table element markdown rendering
 * Handles rendering of table elements
 */

import { ASTNode, isParentNode } from '../../ast/types.js';
import { MarkdownRenderer } from './base.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Table element renderer that implements table-specific rendering methods
 */
export abstract class TableRenderer extends MarkdownRenderer {
  /**
   * Renders a table node
   * @param node Table node
   * @returns Markdown string
   */
  protected renderTable(node: ASTNode): string {
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
        
        if (columnWidths[i] === undefined) {
          columnWidths[i] = cellWidth;
        } else if (cellWidth > columnWidths[i]) {
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
  protected renderTableRow(node: ASTNode, columnWidths: number[] = []): string {
    if (!isParentNode(node)) return '';
    
    debugLog(`Rendering table row with ${node.children.length} cells`, "info");
    
    // Get cells
    const cells = node.children;
    const cellsContent = [];
    
    // Ensure we're working with an array of cells
    if (!Array.isArray(cells)) {
      debugLog('Expected array of cells but got:', "warn", cells);
      return '| |';
    }
    
    // Render each cell
    for (let i = 0; i < Math.max(cells.length, columnWidths.length); i++) {
      let content = '';
      
      if (i < cells.length) {
        content = this.renderTableCell(cells[i]).trim();
      }
      
      // Pad to column width
      const width = columnWidths[i] || 3;
      
      // Get alignment if available
      let align = null;
      if (node.parent && 'align' in node.parent && Array.isArray(node.parent.align) && i < node.parent.align.length) {
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
      
      cellsContent.push(content);
    }
    
    return `| ${cellsContent.join(' | ')} |`;
  }
  
  /**
   * Renders a table cell node
   * @param node Table cell node
   * @returns Markdown string
   */
  protected renderTableCell(node: ASTNode): string {
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
}