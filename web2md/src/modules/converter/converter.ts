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

      // Determine if we should use raw links rule
      const useRawLinks = config.preserveRawUrls;
      
      // Apply custom rules
      for (const rule of rules) {
        // Skip text-links rule if we're using raw-links and this is the standard link rule
        if (useRawLinks && (rule.name === 'link' || rule.name === 'imageLink')) {
          this.logger.debug(`Skipping ${rule.name} rule to use raw links instead`);
          continue;
        }
        
        this.logger.debug(`Applying rule: ${rule.name}`);
        turndownService.addRule(rule.name, {
          filter: rule.filter,
          replacement: (content, node) => {
            // Ensure we're passing the node correctly
            return rule.replacement(content, node as unknown as DOMNode);
          }
        });
      }
      
      // Parse HTML with JSDOM using options that prevent URL modification
      this.logger.debug('Parsing HTML with JSDOM');
      const jsdomOptions = {
        url: 'http://localhost', // Use a consistent base URL
        runScripts: 'outside-only' as const, // Don't run scripts
        resources: 'usable' as const, // Don't load external resources
        storageQuota: 10000000
      };
      
      const { document } = new JSDOM(html, jsdomOptions).window;
      
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