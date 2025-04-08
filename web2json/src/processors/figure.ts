import { Figure, SvgElement } from '../schema/figure.js';
import { logger } from '../utils/logger.js';
import { normalizeTextContent } from '../utils/html.js';

/**
 * Process a figure element and its contents
 */
export function processFigure(figureElement: Element): Figure {
  logger.debug('Processing figure element');
  
  // Extract caption from figcaption element
  const figcaptionElement = figureElement.querySelector('figcaption');
  const caption = figcaptionElement 
    ? normalizeTextContent(figcaptionElement.textContent || 'Figure') 
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
      
    case 'line':
      processLineAttributes(element, result);
      break;
      
    case 'polygon':
    case 'polyline':
      processPolyAttributes(element, result);
      break;
      
    case 'ellipse':
      processEllipseAttributes(element, result);
      break;
      
    case 'g':
      processGroupAttributes(element, result);
      // Process children of group
      const children = Array.from(element.children).map(processGraphicElement);
      result.children = children.filter(child => child !== null);
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
  addNumericAttribute(element, result, 'rx');
  addNumericAttribute(element, result, 'ry');
  
  // Add style attributes
  addStyleAttributes(element, result);
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
  addStyleAttributes(element, result);
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
  
  // Add style attributes
  addStyleAttributes(element, result);
}

/**
 * Process attributes for path elements
 */
function processPathAttributes(element: Element, result: Record<string, any>): void {
  // Add path data
  addStringAttribute(element, result, 'd');
  
  // Add style attributes
  addStyleAttributes(element, result);
}

/**
 * Process attributes for line elements
 */
function processLineAttributes(element: Element, result: Record<string, any>): void {
  // Add line coordinates
  addNumericAttribute(element, result, 'x1');
  addNumericAttribute(element, result, 'y1');
  addNumericAttribute(element, result, 'x2');
  addNumericAttribute(element, result, 'y2');
  
  // Add style attributes
  addStyleAttributes(element, result);
}

/**
 * Process attributes for polygon/polyline elements
 */
function processPolyAttributes(element: Element, result: Record<string, any>): void {
  // Add points
  addStringAttribute(element, result, 'points');
  
  // Add style attributes
  addStyleAttributes(element, result);
}

/**
 * Process attributes for ellipse elements
 */
function processEllipseAttributes(element: Element, result: Record<string, any>): void {
  // Add ellipse properties
  addNumericAttribute(element, result, 'cx');
  addNumericAttribute(element, result, 'cy');
  addNumericAttribute(element, result, 'rx');
  addNumericAttribute(element, result, 'ry');
  
  // Add style attributes
  addStyleAttributes(element, result);
}

/**
 * Process attributes for group elements
 */
function processGroupAttributes(element: Element, result: Record<string, any>): void {
  // Add transform attribute if present
  addStringAttribute(element, result, 'transform');
  
  // Add style attributes
  addStyleAttributes(element, result);
}

/**
 * Process common attributes for any SVG element
 */
function processCommonAttributes(element: Element, result: Record<string, any>): void {
  // Add common positional attributes
  addNumericAttribute(element, result, 'x');
  addNumericAttribute(element, result, 'y');
  addNumericAttribute(element, result, 'width');
  addNumericAttribute(element, result, 'height');
  
  // Add style attributes
  addStyleAttributes(element, result);
  
  // Add transform if present
  addStringAttribute(element, result, 'transform');
}

/**
 * Add style attributes to the result object
 */
function addStyleAttributes(element: Element, result: Record<string, any>): void {
  // Add fill and stroke attributes
  addStringAttribute(element, result, 'fill');
  addStringAttribute(element, result, 'stroke');
  addStringAttribute(element, result, 'stroke-width');
  addStringAttribute(element, result, 'opacity');
  
  // Process style attribute
  const style = element.getAttribute('style');
  if (style) {
    const styleObj: Record<string, string> = {};
    
    // Parse style attribute
    style.split(';').forEach(pair => {
      const [name, value] = pair.split(':').map(s => s.trim());
      if (name && value) {
        // Convert kebab-case to camelCase
        const camelName = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        styleObj[camelName] = value;
      }
    });
    
    // Add style properties to result
    if (Object.keys(styleObj).length > 0) {
      result.style = styleObj;
    }
  }
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