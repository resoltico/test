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
      let processedHtml = html;
      let restoreMarkdown = async (markdown: string) => markdown;
      let mathDebugInfo = null;
      
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
        
        // Process the HTML for math content - extract and replace with placeholders
        const mathProcessingResult = await this.mathProcessor.process(html);
        processedHtml = mathProcessingResult.html;
        restoreMarkdown = mathProcessingResult.restoreMarkdown;
        mathDebugInfo = mathProcessingResult.debug;
        
        if (mathDebugInfo) {
          this.logger.debug(`Math processing extracted ${mathDebugInfo.placeholderCount} placeholders`);
          this.logger.debug(`Math breakdown: ${mathDebugInfo.displayCount} display equations, ${mathDebugInfo.inlineCount} inline equations`);
        }
      }
      
      // Create a DOM from the HTML
      const dom = new JSDOM(processedHtml);
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
      
      // Restore math content from placeholders
      if (this.mathProcessor && config.math.enabled && mathDebugInfo && mathDebugInfo.placeholderCount > 0) {
        this.logger.debug('Restoring math content from placeholders');
        markdown = await restoreMarkdown(markdown);
        this.logger.debug('Math restoration completed');
      }
      
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
        let markdown = turndownService.turndown(html);
        return markdown;
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
    
    // Ensure proper spacing around block math delimiters
    if (config.math.enabled) {
      const blockDelimiter = config.math.blockDelimiter;
      const escapedDelimiter = blockDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Add blank lines around block math if they don't already have them
      const blockMathRegex = new RegExp(`([^\n])(${escapedDelimiter}[^${escapedDelimiter}]+?${escapedDelimiter})([^\n])`, 'g');
      processed = processed.replace(blockMathRegex, '$1\n\n$2\n\n$3');
    }
    
    return processed;
  }
}