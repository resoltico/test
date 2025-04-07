import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import { DocumentSchema } from '../models/document.js';
import { logger } from '../utils/logger.js';

export function extractDocumentInfo($: cheerio.CheerioAPI): Pick<DocumentSchema, 'title'> {
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Document';
  
  logger.debug(`Extracted document title: ${title}`);
  
  return {
    title: decode(title)
  };
}
