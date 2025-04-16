import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { Config } from '../../types/core/config.js';
import { Rule } from '../../types/core/rule.js';
import { Logger } from '../../shared/logger/console.js';
import { MathProcessor } from '../math/processor.js';

/**
 * Converter for HTML to Markdown transformation
 */
export class Converter {
  constructor(
    private logger: Logger,
    private mathProcessor?: MathProcessor
  ) {}
  
  /**
   * Set the math processor
   */
  setMathProcessor(processor: MathProcessor): void {
    this.mathProcessor = processor;
  }

  /**
   * Convert HTML to Markdown
   * @param html The HTML content to convert
   * @param rules The rules to apply during conversion
   * @param config The application configuration
   * @returns The converted Markdown content
   */
  async convert(html: string, rules: Rule[], config: Config): Promise<string> {
    this.logger.debug('Starting HTML to Markdown conversion');

    try {
      // Process math elements if math processor is available
      if (this.mathProcessor && config.math.enabled) {
        this.logger.debug('Pre-processing math elements');
        
        // Configure the math processor with the config
        this.mathProcessor.configure({
          inlineDelimiter: config.math.inlineDelimiter,
          blockDelimiter: config.math.blockDelimiter,
          preserveOriginal: config.math.preserveOriginal,
          outputFormat: config.math.outputFormat,
          selectors: config.math.selectors
        });
        
        html = await this.mathProcessor.preprocessHtml(html);
      }
      
      // Create a DOM from the HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Clean up the document
      this.cleanDocument(document, config.ignoreTags);
      
      // Configure Turndown
      const turndownService = new TurndownService({
        headingStyle: config.headingStyle,
        bulletListMarker: config.listMarker,
        codeBlockStyle: config.codeBlockStyle,
        emDelimiter: '_',
        strongDelimiter: '**',
        linkStyle: 'inlined',
        linkReferenceStyle: 'full',
        preformattedCode: false
      });
      
      // Apply custom rules
      this.applyRules(turndownService, rules);
      
      // Convert to Markdown
      let markdown = turndownService.turndown(document.body);
      
      // Post-process the output
      markdown = this.postProcessMarkdown(markdown, config);
      
      this.logger.debug('HTML to Markdown conversion completed');
      return markdown;
    } catch (error) {
      this.logger.error('Error during HTML to Markdown conversion');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      
      // Return a simple fallback conversion attempt
      try {
        const turndownService = new TurndownService();
        return turndownService.turndown(html);
      } catch (fallbackError) {
        this.logger.error('Fallback conversion also failed');
        return `Error: Could not convert HTML to Markdown.\nOriginal HTML:\n\n${html}`;
      }
    }
  }
  
  /**
   * Clean the document by removing unwanted elements
   * @param document The document to clean
   * @param ignoreTags Tags to remove
   */
  private cleanDocument(document: Document, ignoreTags: string[]): void {
    this.logger.debug(`Cleaning document, removing ${ignoreTags.join(', ')} tags`);
    
    for (const tag of ignoreTags) {
      const elements = document.getElementsByTagName(tag);
      
      // Remove elements from end to start to avoid index shifts
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    }
  }
  
  /**
   * Apply rules to the Turndown service
   * @param turndownService The Turndown service
   * @param rules The rules to apply
   */
  private applyRules(turndownService: TurndownService, rules: Rule[]): void {
    this.logger.debug(`Applying ${rules.length} rules`);
    
    for (const rule of rules) {
      this.logger.debug(`Adding rule: ${rule.name}`);
      
      turndownService.addRule(rule.name, {
        filter: rule.filter,
        replacement: rule.replacement
      });
    }
  }
  
  /**
   * Post-process the Markdown output
   * @param markdown The Markdown content
   * @param config The application configuration
   * @returns The processed Markdown
   */
  private postProcessMarkdown(markdown: string, config: Config): string {
    // Clean up multiple blank lines
    let processed = markdown.replace(/\n{3,}/g, '\n\n');
    
    // Ensure math delimiters are properly spaced
    if (config.math.enabled) {
      const inlineDelim = this.escapeRegExp(config.math.inlineDelimiter);
      const blockDelim = this.escapeRegExp(config.math.blockDelimiter);
      
      // Ensure inline math has proper spacing around it if needed
      if (inlineDelim !== '\\$') { // Skip for standard $ which is already well-handled
        // Space before the opening delimiter if preceded by non-whitespace and not part of the delimiter
        const inlineStartRegex = new RegExp(`([^\\s${inlineDelim[0]}])${inlineDelim}([^\\s])`, 'g');
        processed = processed.replace(inlineStartRegex, `$1 ${config.math.inlineDelimiter}$2`);
        
        // Space after the closing delimiter if followed by non-whitespace and not part of the delimiter
        const inlineEndRegex = new RegExp(`([^\\s])${inlineDelim}([^\\s${inlineDelim[0]}])`, 'g');
        processed = processed.replace(inlineEndRegex, `$1${config.math.inlineDelimiter} $2`);
      }
      
      // Ensure block math has blank lines around it
      const blockStartRegex = new RegExp(`([^\\n])${blockDelim}`, 'g');
      processed = processed.replace(blockStartRegex, `$1\n\n${config.math.blockDelimiter}`);
      
      const blockEndRegex = new RegExp(`${blockDelim}([^\\n])`, 'g');
      processed = processed.replace(blockEndRegex, `${config.math.blockDelimiter}\n\n$1`);
    }
    
    return processed;
  }
  
  /**
   * Escape special characters in a string for use in a regular expression
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}