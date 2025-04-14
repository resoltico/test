/**
 * Turndown library adapter
 */
import TurndownService from 'turndown';
import { TurndownServiceInterface } from '../types.js';
import { Rule, RuleFilter, RuleReplacement } from '../../../types.js';

/**
 * Adapter for the Turndown library
 */
export class TurndownAdapter implements TurndownServiceInterface {
  private turndownService: TurndownService;
  
  constructor() {
    // Initialize Turndown service with default options
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-'
    });
  }
  
  /**
   * Configures the Turndown service with options
   */
  configure(options: Record<string, unknown>): void {
    // Set options on the Turndown service
    for (const [key, value] of Object.entries(options)) {
      // Handle specific options that need special treatment
      switch (key) {
        case 'listMarker':
          // Map to Turndown's bulletListMarker option
          // Make sure value is one of the allowed bullet list markers
          if (value === '-' || value === '*' || value === '+') {
            this.turndownService.options.bulletListMarker = value;
          }
          break;
          
        case 'headingStyle':
          // These map directly to Turndown options
          if (value === 'atx' || value === 'setext') {
            this.turndownService.options.headingStyle = value;
          }
          break;
          
        case 'codeBlockStyle':
          // These map directly to Turndown options
          if (value === 'indented' || value === 'fenced') {
            this.turndownService.options.codeBlockStyle = value;
          }
          break;
          
        case 'ignoreTags':
          // Set up tags to ignore
          const ignoreTags = value as string[];
          for (const tag of ignoreTags) {
            // Use a node filter function to handle any tag value
            this.turndownService.remove(
              (node: Node) => node.nodeName.toLowerCase() === tag.toLowerCase()
            );
          }
          break;
      }
    }
  }
  
  /**
   * Adds a rule to the Turndown service
   */
  addRule(rule: Rule): void {
    // Convert our rule format to Turndown's format
    this.turndownService.addRule(rule.name, {
      filter: this.convertFilter(rule.filter),
      replacement: this.convertReplacement(rule.replacement)
    });
  }
  
  /**
   * Converts our filter format to Turndown's filter format
   */
  private convertFilter(filter: RuleFilter): TurndownService.Filter {
    if (typeof filter === 'string') {
      // Convert string filter to a node filter function
      return (node: Node) => node.nodeName.toLowerCase() === filter.toLowerCase();
    } else if (Array.isArray(filter)) {
      // Convert array filter to a node filter function
      return (node: Node) => {
        const nodeName = node.nodeName.toLowerCase();
        return filter.some(f => f.toLowerCase() === nodeName);
      };
    } else {
      // For function filters, we need to adapt the signature
      return (node: Node, options: TurndownService.Options) => {
        return filter(node, options as unknown as Record<string, unknown>);
      };
    }
  }
  
  /**
   * Converts our replacement function to Turndown's replacement function
   */
  private convertReplacement(replacement: RuleReplacement): TurndownService.ReplacementFunction {
    return (content: string, node: Node, options: TurndownService.Options) => {
      return replacement(content, node, options as unknown as Record<string, unknown>);
    };
  }
  
  /**
   * Converts HTML content to Markdown
   */
  turndown(content: string): string {
    return this.turndownService.turndown(content);
  }
}
