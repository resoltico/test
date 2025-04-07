import * as cheerio from 'cheerio';
import type { FigureSchema } from '../../models/elements/figure.js';
import { logger } from '../../utils/logger.js';

export function processFigure($figure: cheerio.Cheerio<cheerio.Element>): FigureSchema {
  const result: FigureSchema = {
    caption: ''
  };

  // Process caption
  const $figcaption = $figure.find('figcaption');
  if ($figcaption.length) {
    result.caption = $figcaption.text().trim();
  }

  // Process SVG
  const $svg = $figure.find('svg');
  if ($svg.length) {
    const width = parseInt($svg.attr('width') || '0', 10) || 300;
    const height = parseInt($svg.attr('height') || '0', 10) || 150;
    
    result.svg = {
      width,
      height,
      elements: []
    };
    
    // Process SVG elements (rect, circle, text, etc.)
    $svg.children().each((_, el) => {
      const $el = cheerio.load(el);
      const type = el.tagName.toLowerCase();
      
      const svgElement: any = { type };
      
      // Common attributes
      const attrs = ['x', 'y', 'width', 'height', 'fill', 'cx', 'cy', 'r'];
      attrs.forEach(attr => {
        const value = $el(el).attr(attr);
        if (value !== undefined) {
          // Convert numeric attributes to numbers
          if (/^\d+(\.\d+)?$/.test(value)) {
            svgElement[attr] = parseFloat(value);
          } else {
            svgElement[attr] = value;
          }
        }
      });
      
      // Handle text elements
      if (type === 'text') {
        svgElement.content = $el(el).text().trim();
        
        // Font size
        const fontSize = $el(el).attr('font-size');
        if (fontSize) {
          svgElement.fontSize = parseInt(fontSize, 10);
        }
      }
      
      result.svg.elements.push(svgElement);
    });
  }
  
  // Process image
  const $img = $figure.find('img');
  if ($img.length && !result.svg) {
    result.img = {
      src: $img.attr('src') || '',
      alt: $img.attr('alt')
    };
  }

  logger.debug(`Processed figure: ${result.caption}`);
  return result;
}
