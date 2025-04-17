import { Logger } from '../../../shared/logger/console.js';
import { detectDisplayMode } from './display-detector.js';
import { extractContent } from './content-extractor.js';

/**
 * Extract a single math element and replace with a placeholder
 */
export function extractMathElement(
  element: Element, 
  format: string, 
  placeholderId: string,
  placeholderMap: Map<string, {content: string; isDisplay: boolean; format: string}>,
  document: Document,
  logger: Logger
): void {
  try {
    // Determine if display mode (block vs inline)
    const isDisplay = detectDisplayMode(element);
    
    // Get the content based on element type and format
    const content = extractContent(element, format);
    
    // Skip if no content
    if (!content) {
      return;
    }
    
    // Store the math content in the map
    placeholderMap.set(placeholderId, {
      content,
      isDisplay,
      format
    });
    
    // Create a special wrapper element that won't be altered during Markdown conversion
    const wrapper = document.createElement('span');
    wrapper.className = 'math-placeholder-wrapper';
    wrapper.setAttribute('data-math-placeholder', 'true');
    wrapper.setAttribute('data-math-format', format);
    wrapper.setAttribute('data-math-display', isDisplay ? 'block' : 'inline');
    
    // Create a special text format with markers that won't be changed
    wrapper.textContent = `${placeholderId}`;
    
    // Replace the original element
    if (element.parentNode) {
      element.parentNode.replaceChild(wrapper, element);
    }
    
    logger.debug(`Extracted math element (${format}, ${isDisplay ? 'block' : 'inline'}) and created placeholder: ${placeholderId}`);
  } catch (error) {
    logger.error(`Error extracting math element: ${error instanceof Error ? error.message : String(error)}`);
    // Skip this element if there's an error
  }
}