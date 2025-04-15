import TurndownService from 'turndown';
import { Rule, Config } from '../../types.js';
import { Logger } from '../../shared/logger/index.js';

export class Converter {
  constructor(private logger: Logger) {}
  
  /**
   * Convert HTML to Markdown using rules
   */
  async convert(html: string, rules: Rule[], config: Config): Promise<string> {
    this.logger.debug('Initializing Turndown service');
    
    // Initialize Turndown service with configuration
    const turndownService = new TurndownService({
      headingStyle: config.headingStyle,
      bulletListMarker: config.listMarker,
      codeBlockStyle: config.codeBlockStyle,
      emDelimiter: '*',
      strongDelimiter: '**',
    });
    
    // Set up ignore tags
    for (const tag of config.ignoreTags) {
      this.logger.debug(`Configuring to ignore tag: ${tag}`);
      // Use a filter function to properly match the tag
      turndownService.remove((node) => {
        return node.nodeName.toLowerCase() === tag.toLowerCase();
      });
    }
    
    // Apply rules
    this.logger.debug(`Applying ${rules.length} rules`);
    for (const rule of rules) {
      turndownService.addRule(rule.name, {
        filter: this.normalizeFilter(rule.filter),
        replacement: (content, node) => rule.replacement(content, node)
      });
    }
    
    // Convert HTML to Markdown
    this.logger.debug('Converting HTML to Markdown');
    const markdown = turndownService.turndown(html);
    
    return markdown;
  }
  
  /**
   * Normalize rule filter for Turndown
   */
  private normalizeFilter(filter: Rule['filter']): any {
    if (typeof filter === 'string') {
      // Single tag name or CSS selector
      return filter;
    } else if (Array.isArray(filter)) {
      // Array of tag names or CSS selectors
      return {
        [Symbol.iterator]: function* () {
          for (const item of filter) {
            yield item;
          }
        }
      };
    } else {
      // Function filter
      return filter;
    }
  }
}