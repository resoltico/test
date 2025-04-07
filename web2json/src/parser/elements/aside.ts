import * as cheerio from 'cheerio';
import type { AsideSchema } from '../../models/elements/aside.js';
import { logger } from '../../utils/logger.js';

export function processAside($aside: cheerio.Cheerio<cheerio.Element>): AsideSchema {
  const result: AsideSchema = {
    content: []
  };

  // Process title from first heading
  const $heading = $aside.find('h1, h2, h3, h4, h5, h6').first();
  if ($heading.length) {
    result.title = $heading.text().trim();
    
    // Remove heading from content processing
    $heading.remove();
  }

  // Process content paragraphs
  $aside.find('p').each((_, paragraph) => {
    const $p = cheerio.load(paragraph);
    result.content.push($p.text().trim());
  });

  logger.debug(`Processed aside${result.title ? `: ${result.title}` : ''}`);
  return result;
}
