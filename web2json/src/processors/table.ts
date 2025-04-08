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
  const caption = captionElement ? captionElement.textContent || 'Table' : 'Table';
  
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
 */
function extractTableHeaders(tableElement: Element): string[] {
  const headers: string[] = [];
  
  // Find header row in thead
  const thead = tableElement.querySelector('thead');
  if (thead) {
    const headerRows = thead.querySelectorAll('tr');
    if (headerRows.length > 0) {
      // Use the first header row
      const headerRow = headerRows[0];
      // Extract header cells
      const headerCells = headerRow.querySelectorAll('th');
      for (const cell of Array.from(headerCells)) {
        headers.push(normalizeTextContent(cell.textContent || ''));
      }
    }
  }
  
  // If no headers found in thead, check for th elements in first row
  if (headers.length === 0) {
    const firstRow = tableElement.querySelector('tr');
    if (firstRow) {
      const headerCells = firstRow.querySelectorAll('th');
      for (const cell of Array.from(headerCells)) {
        headers.push(normalizeTextContent(cell.textContent || ''));
      }
    }
  }
  
  // If still no headers, try to extract column headers from first row
  if (headers.length === 0) {
    const firstRow = tableElement.querySelector('tr');
    if (firstRow) {
      const cells = firstRow.querySelectorAll('td');
      for (const cell of Array.from(cells)) {
        headers.push(normalizeTextContent(cell.textContent || ''));
      }
      
      // Since we used the first row for headers, we'll need to skip it when processing rows
    }
  }
  
  // Ensure we have at least some headers
  if (headers.length === 0) {
    // Create generic column headers
    const firstRowCells = tableElement.querySelector('tr')?.children || [];
    for (let i = 0; i < firstRowCells.length; i++) {
      headers.push(`Column ${i + 1}`);
    }
  }
  
  return headers;
}

/**
 * Extract table rows from tbody element or directly from table
 */
function extractTableRows(tableElement: Element): string[][] {
  const rows: string[][] = [];
  
  // Find tbody element or use table directly
  const tbody = tableElement.querySelector('tbody') || tableElement;
  const rowElements = tbody.querySelectorAll('tr');
  
  // Determine if first row should be skipped (if it was used for headers)
  let startIndex = 0;
  const thead = tableElement.querySelector('thead');
  
  if (!thead) {
    // No thead - check if first row has th elements
    const firstRow = rowElements[0];
    
    if (firstRow && firstRow.querySelector('th')) {
      // First row contains headers, skip it
      startIndex = 1;
    }
  }
  
  // Process each data row
  for (let i = startIndex; i < rowElements.length; i++) {
    const rowElement = rowElements[i];
    const row: string[] = [];
    
    // Skip rows in thead and tfoot
    if (rowElement.closest('thead') || rowElement.closest('tfoot')) {
      continue;
    }
    
    // Extract cell values (prefer td but fall back to th if needed)
    const cells = rowElement.querySelectorAll('td, th');
    
    for (const cell of Array.from(cells)) {
      // Skip th cells if we have td cells in this row
      if (cell.tagName.toLowerCase() === 'th' && rowElement.querySelector('td')) {
        continue;
      }
      
      row.push(normalizeTextContent(cell.textContent || ''));
    }
    
    // Only add non-empty rows
    if (row.length > 0 && row.some(cell => cell.trim() !== '')) {
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
  const footerText = normalizeTextContent(tfoot.textContent || '');
  
  return footerText || undefined;
}
