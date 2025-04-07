import * as cheerio from 'cheerio';
import type { TableSchema } from '../../models/elements/table.js';
import { logger } from '../../utils/logger.js';

export function processTable($table: cheerio.Cheerio<cheerio.Element>): TableSchema {
  const result: TableSchema = {
    headers: [],
    rows: []
  };

  // Process caption
  const caption = $table.find('caption').text().trim();
  if (caption) {
    result.caption = caption;
  }

  // Process headers
  const $headers = $table.find('thead th');
  if ($headers.length) {
    result.headers = $headers.map((_, el) => {
      return cheerio.load(el).text().trim();
    }).get();
  } else {
    // Fallback to first row if no thead
    const $firstRow = $table.find('tr').first();
    result.headers = $firstRow.find('th, td').map((_, el) => {
      return cheerio.load(el).text().trim();
    }).get();
  }

  // Process rows
  const $rows = $table.find('tbody tr');
  if ($rows.length) {
    $rows.each((_, row) => {
      const $row = cheerio.load(row);
      const cells = $row('td').map((_, cell) => {
        return $row(cell).text().trim();
      }).get();
      result.rows.push(cells);
    });
  } else {
    // Fallback to all rows if no tbody
    const $allRows = $table.find('tr');
    
    // Skip the first row if it was used for headers
    const startIndex = $table.find('thead').length ? 0 : 1;
    
    $allRows.slice(startIndex).each((_, row) => {
      const $row = cheerio.load(row);
      const cells = $row('td').map((_, cell) => {
        return $row(cell).text().trim();
      }).get();
      if (cells.length > 0) {
        result.rows.push(cells);
      }
    });
  }

  // Process footer
  const $footer = $table.find('tfoot');
  if ($footer.length) {
    result.footer = $footer.text().trim();
  }

  logger.debug(`Processed table with ${result.headers.length} headers and ${result.rows.length} rows`);
  return result;
}
