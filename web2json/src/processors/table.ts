import { Table } from '../schema/table.js';
import { logger } from '../utils/logger.js';
import { normalizeHtmlContent, normalizeTextContent } from '../utils/html.js';

/**
 * Process a table element into the structured JSON format
 */
export function processTable(tableElement: Element): Table {
  logger.debug('Processing table element');
  
  // Extract caption if present
  const captionElement = tableElement.querySelector('caption');
  const caption = captionElement 
    ? normalizeTextContent(captionElement.textContent || 'Table') 
    : 'Table';
  
  // Process headers from thead
  const headers = extractTableHeaders(tableElement);
  
  // Process rows from tbody
  const rows = extractTableRows(tableElement);
  
  // Process footer from tfoot
  const footer = extractTableFooter(tableElement);
  
  // Create the table object
  const table: Table = {
    caption,
    headers,
    rows
  };
  
  // Add footer if present
  if (footer) table.footer = footer;
  
  return table;
}

/**
 * Extract table headers from thead element
 * This handles various table structures
 */
function extractTableHeaders(tableElement: Element): string[] {
  const headers: string[] = [];
  
  // Try multiple strategies to extract headers
  // Strategy 1: Use thead > tr > th elements (most common)
  const thead = tableElement.querySelector('thead');
  if (thead) {
    const headerCells = thead.querySelectorAll('th');
    if (headerCells.length > 0) {
      for (const cell of Array.from(headerCells)) {
        headers.push(normalizeTextContent(cell.textContent || ''));
      }
      return headers;
    }
  }
  
  // Strategy 2: Use first row with th elements
  const rows = tableElement.querySelectorAll('tr');
  if (rows.length > 0) {
    const firstRow = rows[0];
    const headerCells = firstRow.querySelectorAll('th');
    if (headerCells.length > 0) {
      for (const cell of Array.from(headerCells)) {
        headers.push(normalizeTextContent(cell.textContent || ''));
      }
      return headers;
    }
  }
  
  // Strategy 3: Use first row (even if td instead of th)
  if (rows.length > 0) {
    const firstRow = rows[0];
    const cells = firstRow.querySelectorAll('td, th');
    for (const cell of Array.from(cells)) {
      headers.push(normalizeTextContent(cell.textContent || ''));
    }
    return headers;
  }
  
  // Fallback: Create generic headers
  const columnCount = estimateColumnCount(tableElement);
  for (let i = 0; i < columnCount; i++) {
    headers.push(`Column ${i + 1}`);
  }
  
  return headers;
}

/**
 * Estimate the number of columns in a table
 */
function estimateColumnCount(tableElement: Element): number {
  const rows = tableElement.querySelectorAll('tr');
  
  // If there are no rows, return 0
  if (rows.length === 0) return 0;
  
  // Count cells in all rows and take the maximum
  let maxCells = 0;
  for (const row of Array.from(rows)) {
    const cells = row.querySelectorAll('td, th');
    maxCells = Math.max(maxCells, cells.length);
  }
  
  return maxCells;
}

/**
 * Extract table rows from tbody element or directly from table
 */
function extractTableRows(tableElement: Element): string[][] {
  const rows: string[][] = [];
  
  // Find row elements - look in tbody first, then in table
  const tbody = tableElement.querySelector('tbody');
  const rowElements = tbody 
    ? tbody.querySelectorAll('tr')
    : tableElement.querySelectorAll('tr');
  
  // Determine if we should skip the first row (if it's a header row)
  let skipFirstRow = false;
  const thead = tableElement.querySelector('thead');
  
  if (!thead && rowElements.length > 0) {
    // Check if first row has th elements
    const firstRow = rowElements[0];
    skipFirstRow = !!firstRow.querySelector('th');
  }
  
  // Process each data row
  let startIndex = skipFirstRow ? 1 : 0;
  
  for (let i = startIndex; i < rowElements.length; i++) {
    const rowElement = rowElements[i];
    
    // Skip rows that are in thead or tfoot
    if (rowElement.closest('thead') || rowElement.closest('tfoot')) {
      continue;
    }
    
    // Process the cells
    const cells = rowElement.querySelectorAll('td, th');
    
    // Skip rows with only th cells if we have other rows
    if (cells.length === 0 || (Array.from(cells).every(cell => cell.tagName.toLowerCase() === 'th') && rowElements.length > 1)) {
      continue;
    }
    
    // Create row data
    const rowData: string[] = [];
    for (const cell of Array.from(cells)) {
      rowData.push(normalizeTextContent(cell.textContent || ''));
    }
    
    // Add non-empty rows
    if (rowData.length > 0 && rowData.some(cell => cell.trim() !== '')) {
      rows.push(rowData);
    }
  }
  
  return rows;
}

/**
 * Extract table footer from tfoot element
 */
function extractTableFooter(tableElement: Element): string | undefined {
  // Find tfoot element
  const tfoot = tableElement.querySelector('tfoot');
  if (!tfoot) return undefined;
  
  // Extract all cells from the footer
  const cells = tfoot.querySelectorAll('td, th');
  if (cells.length === 0) return undefined;
  
  // Combine all cell content
  const footerText = Array.from(cells)
    .map(cell => normalizeTextContent(cell.textContent || ''))
    .join(' ')
    .trim();
  
  return footerText || undefined;
}