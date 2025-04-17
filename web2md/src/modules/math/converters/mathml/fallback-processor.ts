import { Logger } from '../../../../shared/logger/console.js';

/**
 * Basic fallback conversion for when parsing fails
 */
export function fallbackMathMLConversion(mathml: string, logger: Logger): string {
  logger.debug('Using fallback MathML conversion');
  
  // Extract text content from tags
  let textContent = mathml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Process common elements
  const processCommonElements = () => {
    // Process fractions
    const fracPattern = /<mfrac[^>]*>\s*<mrow[^>]*>(.*?)<\/mrow>\s*<mrow[^>]*>(.*?)<\/mrow>\s*<\/mfrac>/gs;
    mathml = mathml.replace(fracPattern, (match, num, den) => {
      const numContent = stripTags(num);
      const denContent = stripTags(den);
      return `\\frac{${numContent}}{${denContent}}`;
    });
    
    // Process superscripts
    const supPattern = /<msup[^>]*>\s*<mi[^>]*>(.*?)<\/mi>\s*<mn[^>]*>(.*?)<\/mn>\s*<\/msup>/gs;
    mathml = mathml.replace(supPattern, (match, base, exp) => {
      return `${base}^{${exp}}`;
    });
    
    // Process subscripts
    const subPattern = /<msub[^>]*>\s*<mi[^>]*>(.*?)<\/mi>\s*<mn[^>]*>(.*?)<\/mn>\s*<\/msub>/gs;
    mathml = mathml.replace(subPattern, (match, base, sub) => {
      return `${base}_{${sub}}`;
    });
    
    // Process square roots
    const sqrtPattern = /<msqrt[^>]*>(.*?)<\/msqrt>/gs;
    mathml = mathml.replace(sqrtPattern, (match, content) => {
      const innerContent = stripTags(content);
      return `\\sqrt{${innerContent}}`;
    });
    
    // Extract the processed content
    textContent = stripTags(mathml);
  };
  
  // Try to process common elements
  try {
    processCommonElements();
  } catch (error) {
    logger.error(`Error in fallback processing: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Replace common operators
  return textContent
    .replace(/×/g, '\\times ')
    .replace(/⋅/g, '\\cdot ')
    .replace(/÷/g, '\\div ')
    .replace(/√/g, '\\sqrt')
    .replace(/∑/g, '\\sum ')
    .replace(/∫/g, '\\int ')
    .replace(/π/g, '\\pi ')
    .replace(/∞/g, '\\infty ')
    .replace(/≤/g, '\\leq ')
    .replace(/≥/g, '\\geq ')
    .replace(/≠/g, '\\neq ')
    .replace(/≈/g, '\\approx ');
}

/**
 * Strip HTML/XML tags from a string
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}