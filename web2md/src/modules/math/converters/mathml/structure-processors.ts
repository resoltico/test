import { ConversionContext } from '../../../../types/modules/math.js';
import { Logger } from '../../../../shared/logger/console.js';
import { processElement, processChildNodes } from './element-processor.js';

/**
 * Process a fraction
 */
export function processFraction(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 2) {
    const num = processElement(children[0], context, logger);
    const den = processElement(children[1], context, logger);
    return `\\frac{${num}}{${den}}`;
  }
  
  // Fallback: just process all children
  return processChildNodes(element, context, logger);
}

/**
 * Process a superscript
 */
export function processSuperscript(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 2) {
    const base = processElement(children[0], context, logger);
    const exp = processElement(children[1], context, logger);
    
    // Special case for single character exponents that are simple
    if (exp.length === 1 && /^[0-9a-zA-Z]$/.test(exp)) {
      return `${base}^${exp}`;
    }
    
    // For more complex exponents, use braces
    return `${base}^{${exp}}`;
  }
  
  // Fallback
  return processChildNodes(element, context, logger);
}

/**
 * Process a subscript
 */
export function processSubscript(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 2) {
    const base = processElement(children[0], context, logger);
    const sub = processElement(children[1], context, logger);
    
    // Special case for single character subscripts that are simple
    if (sub.length === 1 && /^[0-9a-zA-Z]$/.test(sub)) {
      return `${base}_${sub}`;
    }
    
    // For more complex subscripts, use braces
    return `${base}_{${sub}}`;
  }
  
  // Fallback
  return processChildNodes(element, context, logger);
}

/**
 * Process a subscript and superscript
 */
export function processSubSup(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 3) {
    const base = processElement(children[0], context, logger);
    const sub = processElement(children[1], context, logger);
    const sup = processElement(children[2], context, logger);
    
    return `${base}_{${sub}}^{${sup}}`;
  }
  
  // Fallback
  return processChildNodes(element, context, logger);
}

/**
 * Process over script (like \hat, \bar, etc.)
 */
export function processOverScript(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 2) {
    const base = processElement(children[0], context, logger);
    const over = processElement(children[1], context, logger);
    
    // Check for common accents
    if (over === '¯' || over === '‾') return `\\overline{${base}}`;
    if (over === '^') return `\\hat{${base}}`;
    if (over === '˜' || over === '∼') return `\\tilde{${base}}`;
    if (over === '→') return `\\vec{${base}}`;
    if (over === '˙') return `\\dot{${base}}`;
    if (over === '¨') return `\\ddot{${base}}`;
    if (over === '⃛') return `\\dddot{${base}}`;
    
    // For limits notation (like \sum limits_{i=1}^{n})
    if (isLargeOperator(base)) {
      return `${base}\\limits^{${over}}`;
    }
    
    // Generic overscript
    return `\\overset{${over}}{${base}}`;
  }
  
  return processChildNodes(element, context, logger);
}

/**
 * Process under script
 */
export function processUnderScript(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 2) {
    const base = processElement(children[0], context, logger);
    const under = processElement(children[1], context, logger);
    
    // For limits notation (like \sum limits_{i=1}^{n})
    if (isLargeOperator(base)) {
      return `${base}\\limits_{${under}}`;
    }
    
    // Generic underscript
    return `\\underset{${under}}{${base}}`;
  }
  
  return processChildNodes(element, context, logger);
}

/**
 * Process under and over scripts
 */
export function processUnderOverScript(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 3) {
    const base = processElement(children[0], context, logger);
    const under = processElement(children[1], context, logger);
    const over = processElement(children[2], context, logger);
    
    // For limits notation (like \sum limits_{i=1}^{n})
    if (isLargeOperator(base)) {
      return `${base}\\limits_{${under}}^{${over}}`;
    }
    
    // Generic underoverscript
    return `\\underset{${under}}{\\overset{${over}}{${base}}}`;
  }
  
  return processChildNodes(element, context, logger);
}

/**
 * Process multi scripts (subscripts, superscripts, pre-subscripts, pre-superscripts)
 */
export function processMultiScripts(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 3) {
    const base = processElement(children[0], context, logger);
    
    // Extract scripts
    let subScript = '';
    let superScript = '';
    let preSubScript = '';
    let preSuperScript = '';
    
    // Process tensor-style indices
    // Pattern is base, sub, super, presub, presuper, ...
    for (let i = 1; i < children.length; i += 2) {
      if (i + 1 < children.length) {
        // We have a pair of scripts
        const sub = processElement(children[i], context, logger);
        const sup = processElement(children[i + 1], context, logger);
        
        if (i === 1) {
          // Normal subscript and superscript
          subScript = sub;
          superScript = sup;
        } else {
          // Pre-scripts
          preSubScript = sub;
          preSuperScript = sup;
        }
      } else {
        // Odd number of scripts, just handle as subscript
        const sub = processElement(children[i], context, logger);
        if (i === 1) {
          subScript = sub;
        } else {
          preSubScript = sub;
        }
      }
    }
    
    // Build the result
    let result = base;
    
    // Add normal scripts
    if (subScript && subScript !== '<none />') {
      result += `_{${subScript}}`;
    }
    
    if (superScript && superScript !== '<none />') {
      result += `^{${superScript}}`;
    }
    
    // Add pre-scripts using \prescript command
    if ((preSubScript && preSubScript !== '<none />') || 
        (preSuperScript && preSuperScript !== '<none />')) {
      // Use {}_{pre-sub}^{pre-sup} base
      const preSubPart = preSubScript ? `_{${preSubScript}}` : '';
      const preSuperPart = preSuperScript ? `^{${preSuperScript}}` : '';
      
      // We need to use \sideset or tensor notation
      result = `{}${preSuperPart}${preSubPart} ${result}`;
    }
    
    return result;
  }
  
  return processChildNodes(element, context, logger);
}

/**
 * Check if a string is a large operator like \sum, \prod, etc.
 */
export function isLargeOperator(text: string): boolean {
  const largeOperators = ['\\sum', '\\prod', '\\int', '\\oint', '\\bigcup', '\\bigcap', 
                        '\\bigvee', '\\bigwedge', '\\coprod', '\\bigoplus', '\\bigotimes'];
  return largeOperators.some(op => text.trim() === op);
}