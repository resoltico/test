import { ConversionContext } from '../../../../types/modules/math.js';
import { Logger } from '../../../../shared/logger/console.js';
import { processElement, processChildNodes } from './element-processor.js';

/**
 * Process a fenced expression (e.g., parentheses, brackets)
 */
export function processFenced(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const open = element.getAttribute('open') || '(';
  const close = element.getAttribute('close') || ')';
  const separators = element.getAttribute('separators') || ',';
  const content = processChildNodes(element, context, logger);
  
  // Map common fence characters to LaTeX
  const mapFence = (fence: string): string => {
    if (fence === '(') return '\\left(';
    if (fence === ')') return '\\right)';
    if (fence === '[') return '\\left[';
    if (fence === ']') return '\\right]';
    if (fence === '{') return '\\left\\{';
    if (fence === '}') return '\\right\\}';
    if (fence === '|') return '\\left|';
    if (fence === '‖') return '\\left\\|';
    return fence;
  };
  
  // Process content with separators
  const openFence = mapFence(open);
  const closeFence = mapFence(close);
  
  // If this looks like a set notation
  if (open === '{' && close === '}') {
    // Check if there's a vertical bar in the content
    if (content.includes('|')) {
      const parts = content.split('|');
      if (parts.length === 2) {
        return `\\left\\{ ${parts[0]} \\; \\middle| \\; ${parts[1]} \\right\\}`;
      }
    }
  }
  
  return `${openFence}${content}${closeFence}`;
}

/**
 * Process a table/matrix
 */
export function processTable(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  // Get all rows
  const rows = Array.from(element.childNodes)
    .filter(n => n.nodeType === 1 && ['mtr', 'mlabeledtr'].includes((n as Element).tagName.toLowerCase()));
  
  // Look for matrix attributes to determine the type
  const hasFrame = element.getAttribute('frame') === 'solid';
  const hasLines = element.getAttribute('rowlines') !== 'none' || element.getAttribute('columnlines') !== 'none';
  
  // Determine matrix type
  let matrixType = 'pmatrix'; // Default: parentheses
  
  if (hasFrame) {
    matrixType = 'Bmatrix'; // Curly braces
  } else {
    // Check for fence attributes from parent
    const parent = element.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'mfenced') {
      const open = parent.getAttribute('open');
      const close = parent.getAttribute('close');
      
      if (open === '[' && close === ']') {
        matrixType = 'bmatrix'; // Square brackets
      } else if (open === '{' && close === '}') {
        matrixType = 'Bmatrix'; // Curly braces
      } else if (open === '|' && close === '|') {
        matrixType = 'vmatrix'; // Vertical bars
      } else if (open === '‖' && close === '‖') {
        matrixType = 'Vmatrix'; // Double vertical bars
      }
    }
  }
  
  // For tables with borders, use array environment instead
  if (hasLines || rows.length >= 10 || (rows.length > 0 && rows[0].childNodes.length >= 10)) {
    return processTableAsArray(element, rows, context, logger);
  }
  
  // Process each row
  const processedRows = rows.map(row => processTableRow(row as Element, context, logger));
  
  // Create a matrix
  return `\\begin{${matrixType}}${processedRows.join(' \\\\ ')}\\end{${matrixType}}`;
}

/**
 * Process a table row
 */
export function processTableRow(
  row: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  // Get all cells in this row
  const cells = Array.from(row.childNodes)
    .filter(n => n.nodeType === 1 && ['mtd', 'mth'].includes((n as Element).tagName.toLowerCase()));
  
  // Process each cell
  return cells.map(cell => processElement(cell, context, logger)).join(' & ');
}

/**
 * Process a table as an array (for tables with borders or large tables)
 */
function processTableAsArray(
  table: Element, 
  rows: Node[],
  context: ConversionContext, 
  logger: Logger
): string {
  const columnCount = Math.max(...rows.map(row => 
    Array.from(row.childNodes).filter(n => 
      n.nodeType === 1 && ['mtd', 'mth'].includes((n as Element).tagName.toLowerCase())
    ).length
  ));
  
  // Create column specification
  const columnSpec = 'c'.repeat(columnCount);
  
  // Process rows
  const processedRows = rows.map(row => processTableRow(row as Element, context, logger));
  
  // Create array
  return `\\left(\\begin{array}{${columnSpec}}${processedRows.join(' \\\\ ')}\\end{array}\\right)`;
}