import { ConversionContext } from '../../../../types/modules/math.js';
import { Logger } from '../../../../shared/logger/console.js';
import { processElement } from './element-processor.js';

/**
 * Process the document to find and convert MathML content
 */
export function processDocument(
  document: Document, 
  context: ConversionContext, 
  logger: Logger
): string {
  // Try to find the math element
  let mathElement = document.querySelector('math');
  
  // If no math element was found directly, try to wrap content in math tags
  if (!mathElement) {
    // Check if we have partial MathML content without the outer math tag
    const hasPartialMathML = 
      document.querySelector('mrow') || 
      document.querySelector('mi') || 
      document.querySelector('mo');
    
    if (hasPartialMathML) {
      // Create a new JSDOM with wrapped content
      const parser = new DOMParser();
      const wrappedDoc = parser.parseFromString(
        `<math xmlns="http://www.w3.org/1998/Math/MathML">${document.body.innerHTML}</math>`,
        'text/html'
      );
      mathElement = wrappedDoc.querySelector('math');
    }
  }
  
  if (!mathElement) {
    throw new Error('No math element found in content');
  }
  
  // Check if this is a display equation based on the math element attributes
  const isDisplayFromAttr = 
    mathElement.getAttribute('display') === 'block' || 
    mathElement.getAttribute('mode') === 'display';
  
  // Use the display mode from the context if provided, otherwise use attribute
  const isDisplay = context.isDisplay !== undefined ? context.isDisplay : isDisplayFromAttr;
  
  // Update context with display mode
  const updatedContext: ConversionContext = {
    ...context,
    isDisplay
  };
  
  // Process the MathML recursively
  return processElement(mathElement, updatedContext, logger);
}