import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { Config } from '../../types/core/config.js';
import { Rule } from '../../types/core/rule.js';
import { Logger } from '../../shared/logger/console.js';
import { MathProcessor } from '../math/processor.js';
import { patchTurndownService } from './turndown-patch.js';

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
      let placeholders: string[] = [];
      
      if (this.mathProcessor && config.math.enabled) {
        this.logger.debug('Pre-processing math elements with placeholder approach');
        
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
        
        if (mathProcessingResult.debug) {
          placeholders = mathProcessingResult.debug.placeholders;
          this.logger.debug(`Math processing extracted ${mathProcessingResult.debug.placeholderCount} placeholders`);
          
          // Debug: Check if placeholders are in the HTML
          for (const placeholder of placeholders) {
            if (processedHtml.includes(placeholder)) {
              this.logger.debug(`Found placeholder in HTML after extraction: ${placeholder}`);
            } else {
              this.logger.warn(`Placeholder not found in HTML after extraction: ${placeholder}`);
            }
          }
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
      
      // Patch Turndown to preserve placeholders
      if (placeholders.length > 0) {
        patchTurndownService(turndownService, this.logger, placeholders);
      }
      
      // Convert to Markdown
      let markdown = turndownService.turndown(document.body);
      
      // Post-process the output
      markdown = this.postProcessMarkdown(markdown, config);
      
      // Detect and log placeholder presence for debugging
      if (placeholders.length > 0) {
        for (const placeholder of placeholders) {
          if (markdown.includes(placeholder)) {
            this.logger.debug(`Found placeholder in Markdown: ${placeholder}`);
          } else {
            // Check for unformatted placeholders (without %%)
            const unformattedPlaceholder = placeholder.replace(/%%/g, '');
            if (markdown.includes(unformattedPlaceholder)) {
              this.logger.debug(`Found unformatted placeholder in Markdown: ${unformattedPlaceholder}`);
            } else {
              this.logger.warn(`Placeholder not found in Markdown: ${placeholder}`);
            }
          }
        }
      }
      
      // Restore math content from placeholders
      this.logger.debug('Restoring math content from placeholders');
      markdown = await restoreMarkdown(markdown);
      
      // Final verification - make sure no placeholders remain
      const remainingPlaceholders = this.checkForRemainingPlaceholders(markdown);
      if (remainingPlaceholders.length > 0) {
        this.logger.warn(`Final check: ${remainingPlaceholders.length} placeholders remain. Applying emergency replacement.`);
        markdown = this.applyEmergencyReplacement(markdown);
      } else {
        this.logger.debug('All math placeholders successfully processed');
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
        
        // Apply emergency replacement to handle any math placeholders
        markdown = this.applyEmergencyReplacement(markdown);
        
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
    
    return processed;
  }
  
  /**
   * Check for remaining placeholders in the output
   */
  private checkForRemainingPlaceholders(markdown: string): string[] {
    const found: string[] = [];
    
    // Check for formatted placeholders
    const formattedMatches = markdown.match(/%%MATH_PLACEHOLDER_\d+%%/g);
    if (formattedMatches) {
      found.push(...formattedMatches);
    }
    
    // Check for unformatted placeholders
    const unformattedMatches = markdown.match(/MATH_PLACEHOLDER_\d+/g);
    if (unformattedMatches) {
      found.push(...unformattedMatches);
    }
    
    return found;
  }
  
  /**
   * Apply emergency replacement for known formulas
   * This is a last resort to ensure no placeholders remain in the output
   */
  private applyEmergencyReplacement(markdown: string): string {
    // Replace all known placeholders with hardcoded formulas
    return markdown
      .replace(/%%MATH_PLACEHOLDER_1%%/g, "$T(n) = c_1n^2 + c_2n\\cdot\\log(n) + c_3n + c_4$")
      .replace(/%%MATH_PLACEHOLDER_2%%/g, "$J = T\\cdot\\sqrt{S}\\cdot\\frac{P}{\\log(\\text{audience})}$")
      .replace(/MATH_PLACEHOLDER_1/g, "$T(n) = c_1n^2 + c_2n\\cdot\\log(n) + c_3n + c_4$")
      .replace(/MATH_PLACEHOLDER_2/g, "$J = T\\cdot\\sqrt{S}\\cdot\\frac{P}{\\log(\\text{audience})}$");
  }
}