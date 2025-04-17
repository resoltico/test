import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { Config } from '../../types/core/config.js';
import { Rule } from '../../types/core/rule.js';
import { Logger } from '../../shared/logger/console.js';
import { MathProcessor } from '../math/processor.js';

/**
 * Function to patch Turndown service to preserve math placeholders
 */
function patchTurndownService(turndownService: TurndownService, logger: Logger, placeholders: string[]): void {
  // Skip if no placeholders to preserve
  if (!placeholders || placeholders.length === 0) {
    return;
  }
  
  logger.debug(`Patching Turndown to preserve ${placeholders.length} placeholders`);
  
  // Save the original escape method
  const originalEscape = turndownService.escape;

  // Override the escape method to bypass our placeholders
  turndownService.escape = function(text: string): string {
    // Skip escaping if the text is a placeholder
    if (placeholders.includes(text)) {
      logger.debug(`Preserved placeholder from escaping: ${text}`);
      return text;
    }
    
    // Check if this text contains a placeholder
    const placeholderIndex = placeholders.findIndex(p => text.includes(p));
    if (placeholderIndex !== -1) {
      const placeholder = placeholders[placeholderIndex];
      logger.debug(`Found placeholder in text: ${placeholder}`);
      
      // Split the text by the placeholder
      const parts = text.split(placeholder);
      
      // Escape each part and join with the unescaped placeholder
      return parts.map(part => originalEscape.call(turndownService, part))
        .join(placeholder);
    }
    
    // Use the original escape method for normal text
    return originalEscape.call(turndownService, text);
  };
  
  // Add a special rule to preserve our placeholders
  turndownService.addRule('preserveMathPlaceholders', {
    filter: (node: Node) => {
      // Skip non-text nodes
      if (node.nodeType !== 3) return false;
      
      // Check if this node contains a placeholder
      const textContent = node.textContent || '';
      return placeholders.some(p => textContent.includes(p));
    },
    replacement: (content: string) => {
      // Return the content unchanged to preserve placeholders
      return content;
    }
  });
  
  logger.debug('Turndown has been patched to preserve placeholders');
}

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
        this.logger.warn(`Found ${remainingPlaceholders.length} remaining placeholders after restoration`);
        for (const placeholder of remainingPlaceholders) {
          this.logger.debug(`Remaining placeholder: ${placeholder}`);
        }
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
}