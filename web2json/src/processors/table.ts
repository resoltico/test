import { Table } from '../schema/table.js';
import { logger } from '../utils/logger.js';

/**
 * Process a table element into the structured JSON format
 */
export function processTable(tableElement: Element): Table {
  logger.debug('Processing table element');
  
  // Extract caption if present
  const captionElement = tableElement.querySelector('caption');
  const caption = captionElement ? captionElement.textContent || '' : undefined;
  
  // Process headers from thead
  const headers = extractTableHeaders(tableElement);
  
  // Process rows from tbody
  const rows = extractTableRows(tableElement);
  
  // Process footer from tfoot
  const footer = extractTableFooter(tableElement);
  
  // Create the table object
  const table: Table = {
    headers,
    rows
  };
  
  // Add optional properties if present
  if (caption) table.caption = caption;
  if (footer) table.footer = footer;
  
  return table;
}

/**
 * Extract table headers from thead element
 */
function extractTableHeaders(tableElement: Element): string[] {
  const headers: string[] = [];
  
  // Find header row in thead
  const thead = tableElement.querySelector('thead');
  if (thead) {
    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      // Extract header cells
      const headerCells = headerRow.querySelectorAll('th');
      for (const cell of Array.from(headerCells)) {
        headers.push(cell.textContent || '');
      }
    }
  }
  
  // If no headers found in thead, check for th elements in first row
  if (headers.length === 0) {
    const firstRow = tableElement.querySelector('tr');
    if (firstRow) {
      const headerCells = firstRow.querySelectorAll('th');
      for (const cell of Array.from(headerCells)) {
        headers.push(cell.textContent || '');
      }
    }
  }
  
  return headers;
}

/**
 * Extract table rows from tbody element
 */
function extractTableRows(tableElement: Element): string[][] {
  const rows: string[][] = [];
  
  // Find tbody element
  const tbody = tableElement.querySelector('tbody');
  const rowElements = tbody 
    ? tbody.querySelectorAll('tr') 
    : tableElement.querySelectorAll('tr');
  
  // Skip the first row if it contains th elements and no headers were found in thead
  let startIndex = 0;
  const firstRow = rowElements[0];
  
  if (firstRow && !tableElement.querySelector('thead') && firstRow.querySelector('th')) {
    startIndex = 1;
  }
  
  // Process each row
  for (let i = startIndex; i < rowElements.length; i++) {
    const rowElement = rowElements[i];
    const row: string[] = [];
    
    // Extract cell values
    const cells = rowElement.querySelectorAll('td');
    for (const cell of Array.from(cells)) {
      row.push(cell.textContent || '');
    }
    
    // Only add non-empty rows
    if (row.length > 0) {
      rows.push(row);
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
  
  // Extract text from footer
  return tfoot.textContent || undefined;
}
