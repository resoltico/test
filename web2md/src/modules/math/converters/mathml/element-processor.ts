import { ConversionContext } from '../../../../types/modules/math.js';
import { Logger } from '../../../../shared/logger/console.js';
import { getOperatorMap, getGreekLetters, getMathFunctions } from './mappings.js';
import { processFraction, processSuperscript, processSubscript, processSubSup } from './structure-processors.js';
import { processFenced, processTable, processTableRow } from './layout-processors.js';

/**
 * Process a math node recursively to convert it to LaTeX
 */
export function processElement(
  node: Node, 
  context: ConversionContext,
  logger: Logger
): string {
  // Text node - just return the text
  if (node.nodeType === 3) { // Node.TEXT_NODE
    const text = (node.textContent || '').trim();
    // Check if this is a Greek letter
    if (text.length === 1 && getGreekLetters()[text]) {
      return getGreekLetters()[text];
    }
    return text;
  }
  
  // Not an element node
  if (node.nodeType !== 1) { // Node.ELEMENT_NODE
    return '';
  }
  
  const el = node as Element;
  const tagName = el.tagName.toLowerCase();
  
  // Handle each MathML element type
  switch (tagName) {
    case 'math':
      return processChildNodes(el, context, logger);
    
    case 'mrow':
      return processChildNodes(el, context, logger);
    
    case 'mi': // Identifier (variable)
      return processIdentifier(el, context, logger);
    
    case 'mn': // Number
      return el.textContent || '';
    
    case 'mo': // Operator
      return processOperator(el, context, logger);
    
    case 'mfrac': // Fraction
      return processFraction(el, context, logger);
    
    case 'msup': // Superscript
      return processSuperscript(el, context, logger);
    
    case 'msub': // Subscript
      return processSubscript(el, context, logger);
    
    case 'msubsup': // Both subscript and superscript
      return processSubSup(el, context, logger);
    
    case 'msqrt': // Square root
      return processSqrt(el, context, logger);
    
    case 'mroot': // nth root
      return processRoot(el, context, logger);
    
    case 'mfenced': // Fenced expression (parentheses, brackets, etc.)
      return processFenced(el, context, logger);
    
    case 'mtable': // Table/matrix
      return processTable(el, context, logger);
    
    case 'mtr': // Table row
      return processTableRow(el, context, logger);
    
    case 'mtd': // Table cell
      return processChildNodes(el, context, logger);
    
    case 'mtext': // Text
      return `\\text{${el.textContent || ''}}`;
      
    // Additional cases for other MathML elements would go here
      
    default:
      // For unknown elements, just process children
      logger.debug(`Unknown MathML element: ${tagName}`);
      return processChildNodes(el, context, logger);
  }
}

/**
 * Process all child nodes of an element
 */
export function processChildNodes(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  return Array.from(element.childNodes)
    .map(child => processElement(child, context, logger))
    .join('');
}

/**
 * Process an identifier (variable)
 */
function processIdentifier(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const text = element.textContent || '';
  
  // Check for single character Greek letters
  if (text.length === 1 && getGreekLetters()[text]) {
    return getGreekLetters()[text];
  }
  
  // Special handling for multi-letter identifiers
  // Common math functions that should not be in italics
  if (getMathFunctions().includes(text.toLowerCase())) {
    return `\\${text}`;
  }
  
  // For variables with multiple letters, use \text to prevent italicizing each letter separately
  if (text.length > 1) {
    // Check if it might be a product of single-letter variables
    if (/^[a-zA-Z]*$/.test(text)) {
      // It's all Latin letters, so it's likely a product of variables
      return text;
    }
    
    // Otherwise use \text
    return `\\text{${text}}`;
  }
  
  return text;
}

/**
 * Process an operator
 */
function processOperator(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const op = element.textContent || '';
  
  // Check for special operators
  if (op in getOperatorMap()) {
    return getOperatorMap()[op];
  }
  
  // Look for MathML operator attributes
  const form = element.getAttribute('form');
  const stretchy = element.getAttribute('stretchy');
  
  // Add proper spacing for binary operators
  if (['+', '-', '=', '<', '>', '≤', '≥', '≈', '≠', '∼', '∝'].includes(op)) {
    return ` ${op} `;
  }
  
  // Handle common large operators
  if (op === '∑') return '\\sum';
  if (op === '∏') return '\\prod';
  if (op === '∫') return '\\int';
  if (op === '∮') return '\\oint';
  
  // Handle stretchy delimiters
  if (stretchy === 'true') {
    if (op === '(') return '\\left(';
    if (op === ')') return '\\right)';
    if (op === '[') return '\\left[';
    if (op === ']') return '\\right]';
    if (op === '{') return '\\left\\{';
    if (op === '}') return '\\right\\}';
    if (op === '|') return '\\left|';
    if (op === '‖') return '\\left\\|';
  }
  
  return op;
}

/**
 * Process a square root
 */
function processSqrt(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const content = processChildNodes(element, context, logger);
  return `\\sqrt{${content}}`;
}

/**
 * Process an nth root
 */
function processRoot(
  element: Element, 
  context: ConversionContext, 
  logger: Logger
): string {
  const children = Array.from(element.childNodes).filter(n => n.nodeType === 1);
  
  if (children.length >= 2) {
    const base = processElement(children[0], context, logger);
    const index = processElement(children[1], context, logger);
    return `\\sqrt[${index}]{${base}}`;
  }
  
  // Fallback
  return `\\sqrt{${processChildNodes(element, context, logger)}}`;
}