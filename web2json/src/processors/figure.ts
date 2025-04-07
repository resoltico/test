import { Figure, SvgElement } from '../schema/figure.js';
import { logger } from '../utils/logger.js';

/**
 * Process a figure element and its contents
 */
export function processFigure(figureElement: Element): Figure {
  logger.debug('Processing figure element');
  
  // Extract caption from figcaption element
  const figcaptionElement = figureElement.querySelector('figcaption');
  const caption = figcaptionElement 
    ? figcaptionElement.textContent || 'Figure' 
    : 'Figure';
  
  // Create the base figure object
  const figure: Figure = {
    caption
  };
  
  // Process SVG if present
  const svgElement = figureElement.querySelector('svg');
  if (svgElement) {
    figure.svg = processSvg(svgElement);
  }
  
  return figure;
}

/**
 * Process an SVG element and its child elements
 */
function processSvg(svgElement: Element) {
  // Extract width and height
  const width = parseInt(svgElement.getAttribute('width') || '0', 10) || 100;
  const height = parseInt(svgElement.getAttribute('height') || '0', 10) || 100;
  
  // Get viewBox if present
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    logger.debug(`SVG has viewBox: ${viewBox}`);
  }
  
  // Process all SVG child elements
  const elements = Array.from(svgElement.children).map(processGraphicElement);
  
  return {
    width,
    height,
    elements: elements.filter(el => el !== null) as SvgElement[]
  };
}

/**
 * Process an individual SVG element (rect, circle, text, etc.)
 */
function processGraphicElement(element: Element): SvgElement | null {
  const type = element.tagName.toLowerCase();
  
  // Create the base element
  const result: Record<string, any> = {
    type
  };
  
  // Process attributes based on element type
  switch (type) {
    case 'rect':
      processRectAttributes(element, result);
      break;
      
    case 'circle':
      processCircleAttributes(element, result);
      break;
      
    case 'text':
      processTextAttributes(element, result);
      break;
      
    case 'path':
      processPathAttributes(element, result);
      break;
      
    default:
      // For other element types, extract common attributes
      processCommonAttributes(element, result);
  }
  
  return result as SvgElement;
}

/**
 * Process attributes for rectangle elements
 */
function processRectAttributes(element: Element, result: Record<string, any>): void {
  // Add standard position and size attributes
  addNumericAttribute(element, result, 'x');
  addNumericAttribute(element, result, 'y');
  addNumericAttribute(element, result, 'width');
  addNumericAttribute(element, result, 'height');
  
  // Add style attributes
  addStringAttribute(element, result, 'fill');
  addStringAttribute(element, result, 'stroke');
}

/**
 * Process attributes for circle elements
 */
function processCircleAttributes(element: Element, result: Record<string, any>): void {
  // Add center and radius attributes
  addNumericAttribute(element, result, 'cx');
  addNumericAttribute(element, result, 'cy');
  addNumericAttribute(element, result, 'r');
  
  // Add style attributes
  addStringAttribute(element, result, 'fill');
  addStringAttribute(element, result, 'stroke');
}

/**
 * Process attributes for text elements
 */
function processTextAttributes(element: Element, result: Record<string, any>): void {
  // Add position attributes
  addNumericAttribute(element, result, 'x');
  addNumericAttribute(element, result, 'y');
  
  // Add content
  result.content = element.textContent || '';
  
  // Add font attributes
  const fontSize = element.getAttribute('font-size');
  if (fontSize) {
    // Extract numeric value (e.g., "12px" -> 12)
    const size = parseInt(fontSize.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(size)) {
      result.fontSize = size;
    }
  }
}

/**
 * Process attributes for path elements
 */
function processPathAttributes(element: Element, result: Record<string, any>): void {
  // Add path data
  addStringAttribute(element, result, 'd');
  
  // Add style attributes
  addStringAttribute(element, result, 'fill');
  addStringAttribute(element, result, 'stroke');
}

/**
 * Process common attributes for any SVG element
 */
function processCommonAttributes(element: Element, result: Record<string, any>): void {
  // Process common attributes found on many SVG elements
  addNumericAttribute(element, result, 'x');
  addNumericAttribute(element, result, 'y');
  addNumericAttribute(element, result, 'width');
  addNumericAttribute(element, result, 'height');
  addStringAttribute(element, result, 'fill');
  addStringAttribute(element, result, 'stroke');
  addStringAttribute(element, result, 'transform');
}

/**
 * Add a numeric attribute to the result object if present on the element
 */
function addNumericAttribute(element: Element, result: Record<string, any>, name: string): void {
  const value = element.getAttribute(name);
  if (value !== null) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      result[name] = numValue;
    }
  }
}

/**
 * Add a string attribute to the result object if present on the element
 */
function addStringAttribute(element: Element, result: Record<string, any>, name: string): void {
  const value = element.getAttribute(name);
  if (value !== null) {
    result[name] = value;
  }
}
