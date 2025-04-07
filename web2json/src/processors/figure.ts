// src/processors/figure.ts
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { Figure, Svg } from '../schema/section.js';
import { extractTextContent } from '../utils/html.js';

/**
 * Process a figure element
 */
export function processFigure($: cheerio.CheerioAPI, figureElement: Element): Figure {
  const $figure = $(figureElement);
  const figure: Figure = {};
  
  // Process figure caption
  const $figcaption = $figure.find('figcaption');
  if ($figcaption.length > 0) {
    figure.caption = extractTextContent($figcaption.html() || '');
  }
  
  // Process SVG if present
  const $svg = $figure.find('svg');
  if ($svg.length > 0) {
    figure.svg = processSvg($, $svg[0]);
  }
  
  return figure;
}

/**
 * Process an SVG element
 */
export function processSvg($: cheerio.CheerioAPI, svgElement: Element): Svg {
  const $svg = $(svgElement);
  
  const svg: Svg = {
    width: parseInt($svg.attr('width') || '0', 10) || undefined,
    height: parseInt($svg.attr('height') || '0', 10) || undefined,
    viewBox: $svg.attr('viewBox') || undefined,
    elements: []
  };
  
  // Process SVG elements (rect, circle, path, text, etc.)
  $svg.children().each((_, el) => {
    const $el = $(el);
    const element: any = {
      type: el.tagName
    };
    
    // Add common attributes if they exist
    if ($el.attr('x')) element.x = parseFloat($el.attr('x') || '0');
    if ($el.attr('y')) element.y = parseFloat($el.attr('y') || '0');
    if ($el.attr('width')) element.width = parseFloat($el.attr('width') || '0');
    if ($el.attr('height')) element.height = parseFloat($el.attr('height') || '0');
    if ($el.attr('fill')) element.fill = $el.attr('fill');
    
    // Special handling for text elements
    if (el.tagName === 'text') {
      element.content = $el.text();
      if ($el.attr('font-size')) {
        element.fontSize = parseFloat($el.attr('font-size') || '12');
      }
    }
    
    svg.elements.push(element);
  });
  
  return svg;
}