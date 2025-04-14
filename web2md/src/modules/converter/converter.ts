/**
 * HTML to Markdown converter implementation
 */
import { TurndownServiceInterface } from './types.js';
import { RulesManager } from '../rules/manager.js';
import { ConfigLoader } from '../config/loader.js';
import { Logger } from '../../types.js';
import { ConversionError } from '../../shared/errors/index.js';

/**
 * Converts HTML content to Markdown using the rules and Turndown service
 */
export class Converter {
  constructor(
    private rulesManager: RulesManager,
    private turndownService: TurndownServiceInterface,
    private configLoader: ConfigLoader,
    private logger: Logger
  ) {}
  
  /**
   * Converts HTML content to Markdown
   */
  async convert(content: string): Promise<string> {
    try {
      // Load configuration
      const config = await this.configLoader.loadConfig();
      
      // Configure the Turndown service
      this.turndownService.configure({
        headingStyle: config.headingStyle,
        listMarker: config.listMarker,
        codeBlockStyle: config.codeBlockStyle,
        ignoreTags: config.ignoreTags
      });
      
      // Load rules
      await this.rulesManager.loadRules();
      
      // Apply rules to the Turndown service
      const rules = this.rulesManager.getRules();
      this.logger.debug(`Applying ${rules.length} rules to the Turndown service`);
      
      for (const rule of rules) {
        this.turndownService.addRule(rule);
      }
      
      // Convert the content
      this.logger.debug('Converting HTML to Markdown');
      const markdown = this.turndownService.turndown(content);
      
      return markdown;
    } catch (error) {
      throw new ConversionError(`Failed to convert HTML to Markdown: ${(error as Error).message}`);
    }
  }
}
