import { MathExtractorOptions } from '../../../types/modules/math.js';
import { MathFormatDetector } from '../detector.js';
import { Logger } from '../../../shared/logger/console.js';
import { shouldSkipElement } from './element-filter.js';

/**
 * Collect all math elements from the document
 */
export function collectMathElements(
  document: Document, 
  options: MathExtractorOptions, 
  formatDetector: MathFormatDetector,
  logger: Logger
): Array<{element: Element, format: string}> {
  const results: Array<{element: Element, format: string}> = [];
  const selectors = options.selectors;
  const seenElements = new Set<Element>(); // Track elements we've already processed
  
  // Function to process elements and detect format
  const processElements = (selector: string, defaultFormat: string) => {
    if (!selector) return;
    
    try {
      const elements = document.querySelectorAll(selector);
      logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Skip if we've already processed this element
        if (seenElements.has(element)) continue;
        seenElements.add(element);
        
        // Skip empty elements
        if (!element.textContent || element.textContent.trim() === '') continue;
        
        // Skip elements that don't look like math
        if (shouldSkipElement(element, logger)) continue;
        
        // Detect the format, defaulting if not detectable
        const format = formatDetector.detectFormat(element) || defaultFormat;
        results.push({element, format});
      }
    } catch (error) {
      logger.error(`Error processing selector "${selector}": ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Process each selector type - with null checks
  if (selectors.mathml) {
    processElements(selectors.mathml, 'mathml');
  }
  
  if (selectors.scripts) {
    processElements(selectors.scripts, 'latex');
  }
  
  if (selectors.dataAttributes) {
    processElements(selectors.dataAttributes, 'latex');
  }
  
  if (selectors.classes) {
    processElements(selectors.classes, 'latex');
  }
  
  if (selectors.attributes) {
    processElements(selectors.attributes, 'latex');
  }
  
  return results;
}