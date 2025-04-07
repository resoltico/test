import { Figure, SvgElement } from '../schema/figure.js';
import { logger } from '../utils/logger.js';

/**
 * Process a figure element
 */
export function processFigure(figureElement: Element): Figure {
  // Extract caption
  const figcaptionElement = figureElement.querySelector('figcaption');
  const caption = figcaptionElement 
    ? figcaptionElement.textContent || ''
    : 'Figure';
  
  // Create the base figure object
  const figure: Figure = {
    caption
  };
  
  // Process SVG if present
  const svgElement = figureElement.querySelector('svg');
  if (svgElement) {
    logger.debug('Processing SVG element in figure');
    figure.svg = processSvg(svgElement);
  }
  
  return figure;
}

/**
 * Process an SVG element
 */
function processSvg(svgElement: Element) {
  // Extract width and height
  const width = parseInt(svgElement.getAttribute('width') || '0', 10) || 100;
  const height = parseInt(svgElement.getAttribute('height') || '0', 10) || 100;
  
  logger.debug(`SVG dimensions: ${width}x${height}`);
  
  // Process SVG child elements
  const elements = Array.from(svgElement.children).map(processGraphicElement);
  
  // Ensure each element has a type to match the schema
  const typedElements = elements.filter(el => el && typeof el === 'object' && 'type' in el);
  
  return {
    width,
    height,
    elements: typedElements
  };
}

/**
 * Process an individual SVG graphic element
 */
function processGraphicElement(element: Element): SvgElement {
  const type = element.tagName.toLowerCase();
  
  logger.debug(`Processing SVG element: ${type}`);
  
  // Base element properties
  const result: any = { type };
  
  // Process common SVG attributes
  const attributes = [
    'x', 'y', 'width', 'height', 'fill', 'stroke', 
    'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
    'points', 'd', 'transform'
  ];
  
  attributes.forEach(attr => {
    const value = element.getAttribute(attr);
    if (value) {
      // Convert numeric attributes to numbers
      if (['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2'].includes(attr)) {
        result[attr] = parseFloat(value);
      } else {
        result[attr] = value;
      }
    }
  });
  
  // Special handling for text elements
  if (type === 'text') {
    result.content = element.textContent || '';
    
    // Extract text-specific attributes
    const fontSizeAttr = element.getAttribute('font-size');
    if (fontSizeAttr) {
      // Extract numeric value from font-size (e.g. "12px" -> 12)
      const fontSize = parseInt(fontSizeAttr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(fontSize)) {
        result.fontSize = fontSize;
      }
    }
  }
  
  return result as SvgElement;
}