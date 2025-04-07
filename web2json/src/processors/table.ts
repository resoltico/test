import { Table } from '../schema/table.js';
import { normalizeTextContent } from '../utils/html.js';

/**
 * Process a table element
 */
export function processTable(tableElement: Element): Table {
  // Extract caption if present
  const captionElement = tableElement.querySelector('caption');
  const caption = captionElement 
    ? normalizeTextContent(captionElement.textContent || '') 
    : undefined;
  
  // Process headers
  const headers: string[] = [];
  const headerRow = tableElement.querySelector('thead tr');
  
  if (headerRow) {
    // Extract header cells
    const headerCells = headerRow.querySelectorAll('th');
    headerCells.forEach(cell => {
      headers.push(normalizeTextContent(cell.textContent || ''));
    });
  }
  
  // Process table body rows
  const rows: string[][] = [];
  const bodyRows = tableElement.querySelectorAll('tbody tr');
  
  bodyRows.forEach(row => {
    const rowData: string[] = [];
    const cells = row.querySelectorAll('td');
    
    cells.forEach(cell => {
      rowData.push(normalizeTextContent(cell.textContent || ''));
    });
    
    if (rowData.length > 0) {
      rows.push(rowData);
    }
  });
  
  // Process footer if present
  const footerElement = tableElement.querySelector('tfoot tr');
  let footer: string | undefined;
  
  if (footerElement) {
    footer = normalizeTextContent(footerElement.textContent || '');
  }
  
  // Create the table object
  const table: Table = {
    headers,
    rows
  };
  
  // Add optional properties
  if (caption) table.caption = caption;
  if (footer) table.footer = footer;
  
  return table;
}
