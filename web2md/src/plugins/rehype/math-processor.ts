/**
 * Math Processor Plugin
 * 
 * A rehype plugin that handles mathematical content in HTML,
 * converting MathML and other math formats to Markdown-compatible notation.
 */

import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

interface Element extends Node {
  tagName: string;
  properties?: {
    [key: string]: any;
    className?: string[];
    type?: string;
    display?: string;
  };
  children: Node[];
  data?: {
    [key: string]: any;
  };
}

interface TextNode extends Node {
  type: 'text';
  value: string;
}

/**
 * Plugin to handle mathematical content in HTML AST
 */
export function handleMath() {
  return function transformer(tree: Node) {
    visit(tree, 'element', (node: Element) => {
      // Handle MathML elements
      if (node.tagName === 'math') {
        // Convert MathML to GitHub-compatible math notation
        convertMathML(node);
      }
      
      // Handle LaTeX in script tags
      if (node.tagName === 'script' && 
          node.properties && 
          node.properties.type && 
          typeof node.properties.type === 'string' &&
          (node.properties.type.includes('math/tex') || 
           node.properties.type.includes('application/x-mathjax'))) {
        // Convert script with LaTeX to GitHub-compatible math notation
        convertScriptMath(node);
      }
      
      // Handle elements with math class
      if (node.properties && 
          node.properties.className &&
          Array.isArray(node.properties.className) &&
          (node.properties.className.includes('math') || 
           node.properties.className.includes('MathJax'))) {
        // Convert classed elements with math content
        convertClassedMath(node);
      }
    });
  };
}

/**
 * Convert MathML element to Markdown math notation
 */
function convertMathML(node: Element): void {
  // Determine if this is inline or block math
  const isDisplay = node.properties && 
                    (node.properties.display === 'block' || 
                     node.properties.display === 'true');
  
  // Extract the math content and convert MathML to LaTeX
  const mathContent = convertMathMLToLatex(node);
  
  // Transform the node
  node.tagName = 'div'; // Change to a div that rehype-remark will handle
  
  // Use double dollars for block math, single for inline
  if (isDisplay) {
    // Block math with double dollars
    node.children = [
      { type: 'text', value: '$$\n' + mathContent + '\n$$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-display'] };
  } else {
    // Inline math with single dollars
    node.children = [
      { type: 'text', value: '$' + mathContent + '$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-inline'] };
  }
}

/**
 * Convert script tag with LaTeX to Markdown math notation
 */
function convertScriptMath(node: Element): void {
  // Extract the math content
  let mathContent = '';
  if (node.children && node.children.length > 0) {
    const textNode = node.children[0] as TextNode;
    mathContent = textNode.value || '';
  }
  
  // Determine if this is display math
  const isDisplay = node.properties?.type?.includes('display') || false;
  
  // Transform the node
  node.tagName = 'div'; // Change to a div
  
  // Use double dollars for block math, single for inline
  if (isDisplay) {
    node.children = [
      { type: 'text', value: '$$\n' + mathContent + '\n$$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-display'] };
  } else {
    node.children = [
      { type: 'text', value: '$' + mathContent + '$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-inline'] };
  }
}

/**
 * Convert element with math class to Markdown math notation
 */
function convertClassedMath(node: Element): void {
  // Extract the math content
  const mathContent = extractTextContent(node);
  
  // Determine if this is display math
  const isDisplay = node.properties?.className?.includes('math-display') || 
                    node.properties?.className?.includes('MathJax_Display') || 
                    node.tagName === 'div'; // Assume divs are block-level
  
  // Clear the children and set the new content
  if (isDisplay) {
    node.children = [
      { type: 'text', value: '$$\n' + mathContent + '\n$$' } as TextNode
    ];
  } else {
    node.children = [
      { type: 'text', value: '$' + mathContent + '$' } as TextNode
    ];
  }
  
  // Ensure proper classes are set
  if (isDisplay) {
    node.properties = { className: ['math', 'math-display'] };
  } else {
    node.properties = { className: ['math', 'math-inline'] };
  }
}

/**
 * Convert MathML to LaTeX notation
 */
function convertMathMLToLatex(node: Element): string {
  // Process the MathML node recursively
  function processMathML(node: Element): string {
    switch (node.tagName) {
      case 'math':
        return processChildren(node);
        
      case 'mrow':
        return processChildren(node);
        
      case 'mo':
        // Operator
        return extractTextContent(node);
        
      case 'mi':
        // Identifier (variable)
        return extractTextContent(node);
        
      case 'mn':
        // Number
        return extractTextContent(node);
        
      case 'mtext':
        // Text
        return "\\text{" + extractTextContent(node) + "}";
        
      case 'msup':
        // Superscript
        if (node.children.length >= 2) {
          const base = processMathML(node.children[0] as Element);
          const exponent = processMathML(node.children[1] as Element);
          return `${base}^{${exponent}}`;
        }
        return '';
        
      case 'msub':
        // Subscript
        if (node.children.length >= 2) {
          const base = processMathML(node.children[0] as Element);
          const subscript = processMathML(node.children[1] as Element);
          return `${base}_{${subscript}}`;
        }
        return '';
        
      case 'msubsup':
        // Both subscript and superscript
        if (node.children.length >= 3) {
          const base = processMathML(node.children[0] as Element);
          const subscript = processMathML(node.children[1] as Element);
          const superscript = processMathML(node.children[2] as Element);
          return `${base}_{${subscript}}^{${superscript}}`;
        }
        return '';
        
      case 'mfrac':
        // Fraction
        if (node.children.length >= 2) {
          const numerator = processMathML(node.children[0] as Element);
          const denominator = processMathML(node.children[1] as Element);
          return `\\frac{${numerator}}{${denominator}}`;
        }
        return '';
        
      case 'msqrt':
        // Square root
        return `\\sqrt{${processChildren(node)}}`;
        
      case 'mroot':
        // Nth root
        if (node.children.length >= 2) {
          const base = processMathML(node.children[0] as Element);
          const index = processMathML(node.children[1] as Element);
          return `\\sqrt[${index}]{${base}}`;
        }
        return '';
        
      case 'munderover':
        // Underover (like limits in integration)
        if (node.children.length >= 3) {
          const base = processMathML(node.children[0] as Element);
          const under = processMathML(node.children[1] as Element);
          const over = processMathML(node.children[2] as Element);
          
          // Special case for integrals
          if (base === '∫' || base === '\\int') {
            return `\\int_{${under}}^{${over}}`;
          }
          
          return `${base}_{${under}}^{${over}}`;
        }
        return '';
        
      case 'munder':
        // Under (like in limit)
        if (node.children.length >= 2) {
          const base = processMathML(node.children[0] as Element);
          const under = processMathML(node.children[1] as Element);
          
          // Special case for limits
          if (base === 'lim') {
            return `\\lim_{${under}}`;
          }
          
          return `${base}_{${under}}`;
        }
        return '';
        
      case 'mover':
        // Over
        if (node.children.length >= 2) {
          const base = processMathML(node.children[0] as Element);
          const over = processMathML(node.children[1] as Element);
          
          // Handle special cases like vectors
          if (over === '→' || over === '↑' || over === '⃗') {
            return `\\vec{${base}}`;
          }
          
          return `\\overset{${over}}{${base}}`;
        }
        return '';
        
      default:
        // For other elements, extract text content
        return extractTextContent(node);
    }
  }
  
  function processChildren(node: Element): string {
    let result = '';
    if (node.children) {
      for (const child of node.children) {
        if ((child as Element).tagName) {
          result += processMathML(child as Element);
        } else if (child.type === 'text') {
          result += (child as TextNode).value;
        }
      }
    }
    return result;
  }
  
  // Start processing from the root MathML node
  let latex = processMathML(node);
  
  // Handle special characters and operators
  latex = latex
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/±/g, '\\pm ')
    .replace(/∞/g, '\\infty ')
    .replace(/π/g, '\\pi ')
    .replace(/θ/g, '\\theta ')
    .replace(/∑/g, '\\sum ')
    .replace(/∏/g, '\\prod ')
    .replace(/∫/g, '\\int ')
    .replace(/∬/g, '\\iint ')
    .replace(/∭/g, '\\iiint ')
    .replace(/∮/g, '\\oint ')
    .replace(/∇/g, '\\nabla ')
    .replace(/∂/g, '\\partial ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/δ/g, '\\delta ')
    .replace(/≤/g, '\\leq ')
    .replace(/≥/g, '\\geq ')
    .replace(/≠/g, '\\neq ')
    .replace(/≈/g, '\\approx ')
    .replace(/∈/g, '\\in ')
    .replace(/∉/g, '\\notin ')
    .replace(/⊂/g, '\\subset ')
    .replace(/⊃/g, '\\supset ')
    .replace(/⊆/g, '\\subseteq ')
    .replace(/⊇/g, '\\supseteq ');
  
  return latex;
}

/**
 * Extract text content from any node
 */
function extractTextContent(node: Node): string {
  let result = '';
  
  function extractText(node: Node): void {
    if (node.type === 'text') {
      result += (node as TextNode).value;
    } else if ((node as Element).children) {
      for (const child of (node as Element).children) {
        extractText(child);
      }
    }
  }
  
  extractText(node);
  return result;
}