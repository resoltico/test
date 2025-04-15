import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { Config } from '../../types/core/config.js';
import { Rule } from '../../types/core/rule.js';
import { Logger } from '../../shared/logger/console.js';
import { ConversionError } from '../../shared/errors/app-error.js';
import { DOMNode } from '../../types/vendor/dom.js';

/**
 * HTML to Markdown converter
 */
export class Converter {
  constructor(private logger: Logger) {}

  /**
   * Convert HTML to Markdown
   */
  async convert(html: string, rules: Rule[], config: Config): Promise<string> {
    try {
      this.logger.debug('Creating Turndown service with configuration');
      
      // Create Turndown service with configuration
      const turndownService = new TurndownService({
        headingStyle: config.headingStyle,
        bulletListMarker: config.listMarker,
        codeBlockStyle: config.codeBlockStyle,
        // Add other Turndown options from config as needed
      });
      
      // Configure tags to ignore
      for (const tag of config.ignoreTags) {
        turndownService.remove(tag);
      }
      
      // Apply custom rules
      for (const rule of rules) {
        this.logger.debug(`Applying rule: ${rule.name}`);
        turndownService.addRule(rule.name, {
          filter: rule.filter,
          replacement: (content, node) => {
            // Ensure we're passing the node correctly
            return rule.replacement(content, node as unknown as DOMNode);
          }
        });
      }
      
      // Parse HTML with JSDOM
      this.logger.debug('Parsing HTML with JSDOM');
      const { document } = new JSDOM(html).window;
      
      // Convert to Markdown
      this.logger.debug('Converting to Markdown');
      const markdown = turndownService.turndown(document.body);
      
      return markdown;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConversionError(`Conversion failed: ${error.message}`);
      }
      throw new ConversionError('Conversion failed with unknown error');
    }
  }
}