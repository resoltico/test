// src/processors/table.ts
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { Table } from '../schema/table.js';
import { cleanHtmlContent, extractTextContent } from '../utils/html.js';

/**
 * Process a table element
 */
export function processTable($: cheerio.CheerioAPI, tableElement: Element): Table {
  const $table = $(tableElement);
  const table: Table = {
    rows: []
  };
  
  // Process caption
  const $caption = $table.find('caption');
  if ($caption.length > 0) {
    table.caption = extractTextContent($caption.html() || '');
  }
  
  // Process headers
  const $headers = $table.find('thead th, thead td');
  if ($headers.length > 0) {
    table.headers = $headers
      .map((_, el) => extractTextContent($(el).html() || ''))
      .get();
  } else {
    // Check if the first row might be a header row
    const $firstRow = $table.find('tr').first();
    const $firstRowCells = $firstRow.find('th');
    
    if ($firstRowCells.length > 0) {
      table.headers = $firstRowCells
        .map((_, el) => extractTextContent($(el).html() || ''))
        .get();
    }
  }
  
  // Process rows
  const $rows = $table.find('tbody tr');
  if ($rows.length > 0) {
    // Process rows in the table body
    $rows.each((_, tr) => {
      const $row = $(tr);
      const cells = $row.find('td, th')
        .map((_, cell) => extractTextContent($(cell).html() || ''))
        .get();
      
      if (cells.length > 0) {
        table.rows.push(cells);
      }
    });
  } else {
    // If no tbody, process rows directly
    // Skip the first row if it was determined to be a header
    const startIndex = table.headers ? 1 : 0;
    
    $table.find('tr').slice(startIndex).each((_, tr) => {
      const $row = $(tr);
      const cells = $row.find('td, th')
        .map((_, cell) => extractTextContent($(cell).html() || ''))
        .get();
      
      if (cells.length > 0) {
        table.rows.push(cells);
      }
    });
  }
  
  // Process footer
  const $footer = $table.find('tfoot');
  if ($footer.length > 0) {
    table.footer = extractTextContent($footer.html() || '');
  }
  
  return table;
}
