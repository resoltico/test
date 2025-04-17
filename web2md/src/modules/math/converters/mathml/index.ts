import { JSDOM } from 'jsdom';
import { MathConverter } from '../base.js';
import { ConversionContext } from '../../../../types/modules/math.js';
import { Logger } from '../../../../shared/logger/console.js';
import { processDocument } from './document-processor.js';
import { processElement } from './element-processor.js';
import { postProcessLatex } from './post-processor.js';
import { fallbackMathMLConversion } from './fallback-processor.js';

/**
 * Converter for MathML format to LaTeX
 * Uses a recursive approach to handle arbitrary MathML structures
 */
export class MathMLConverter extends MathConverter {
  constructor(logger: Logger) {
    super(logger);
  }
  
  /**
   * Convert MathML to LaTeX format
   */
  async convert(content: string, context: ConversionContext): Promise<string> {
    try {
      this.logger.debug(`Converting MathML to LaTeX`);
      
      // Quick check if content is already LaTeX
      if (content.trim().startsWith('\\') && !content.includes('<')) {
        return content;
      }
      
      // Check if it looks like MathML
      if (!content.includes('<math') && !content.includes('<mrow') && !content.includes('<mi')) {
        // Not MathML, return as is
        return content;
      }
      
      // Try to parse the MathML
      try {
        // Create a wrapper div to ensure we have a proper DOM structure
        // Use namespace-aware parsing for MathML
        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div>${content}</div></body></html>`, {
          contentType: 'text/html',
        });
        
        // Process the document to find and convert the MathML
        const result = processDocument(dom.window.document, context, this.logger);
        
        // Post-process to ensure proper formatting
        return postProcessLatex(result);
      } catch (parseError) {
        this.logger.error(`Error parsing MathML: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        
        // Try a less strict parsing approach - extract the math element content using regex
        const mathMatch = content.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
        if (mathMatch && mathMatch[1]) {
          this.logger.debug('Attempting regex-based parsing of MathML content');
          return fallbackMathMLConversion(mathMatch[1], this.logger);
        }
        
        // Fallback to basic MathML to LaTeX conversion
        return fallbackMathMLConversion(content, this.logger);
      }
    } catch (error) {
      this.logger.error(`Error converting MathML to LaTeX: ${error instanceof Error ? error.message : String(error)}`);
      // Return cleaned content with LaTeX escape sequences
      return this.cleanContent(content);
    }
  }
}