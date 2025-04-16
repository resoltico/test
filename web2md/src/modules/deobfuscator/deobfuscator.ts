import { DeobfuscationConfig } from '../../types/core/config.js';
import { DeobfuscationResult, PatternMatch } from '../../types/core/deobfuscation.js';
import { PatternDetector } from './patterns.js';
import { DecoderRegistry } from './decoder.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Main deobfuscation orchestrator
 */
export class Deobfuscator {
  private config: DeobfuscationConfig;
  private enabled: boolean = true;
  
  constructor(
    private decoderRegistry: DecoderRegistry,
    private patternDetector: PatternDetector,
    private logger: Logger
  ) {
    // Default configuration
    this.config = {
      enabled: true,
      decoders: ['cloudflare', 'base64', 'rot13'],
      emailLinks: true,
      cleanScripts: true,
      preserveRawLinks: false
    };
  }
  
  /**
   * Configure the deobfuscator
   * @param config The deobfuscation configuration
   */
  configure(config: DeobfuscationConfig): void {
    this.config = config;
    this.enabled = config.enabled;
    this.logger.debug(`Deobfuscator configured, enabled: ${this.enabled}`);
    
    if (this.enabled) {
      this.logger.debug(`Enabled decoders: ${this.config.decoders.join(', ')}`);
    }
  }
  
  /**
   * Check if deobfuscation is enabled
   * @returns Whether deobfuscation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Enable or disable deobfuscation
   * @param enabled Whether to enable deobfuscation
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.debug(`Deobfuscation ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Process HTML content for deobfuscation
   * @param html The HTML content to deobfuscate
   * @returns The deobfuscated HTML content
   */
  async process(html: string): Promise<string> {
    if (!this.enabled) {
      this.logger.debug('Deobfuscation is disabled, returning original content');
      return html;
    }
    
    this.logger.debug('Starting deobfuscation process');
    
    try {
      // Clean scripts if configured
      let processedHtml = html;
      
      if (this.config.cleanScripts) {
        processedHtml = this.cleanScripts(processedHtml);
      }
      
      // Detect obfuscation patterns
      const patterns = this.patternDetector.detectPatterns(processedHtml);
      this.logger.debug(`Detected ${patterns.length} obfuscation patterns`);
      
      if (patterns.length === 0) {
        this.logger.debug('No obfuscation patterns detected');
        return processedHtml;
      }
      
      // Process patterns from end to start to avoid index shifts
      const sortedPatterns = [...patterns].sort((a, b) => b.start - a.start);
      let patternCount = 0;
      
      for (const pattern of sortedPatterns) {
        // Skip patterns with decoders that aren't enabled
        if (!this.config.decoders.includes(pattern.type)) {
          this.logger.debug(`Skipping ${pattern.type} decoder (not enabled)`);
          continue;
        }
        
        // Get the appropriate decoder
        const decoder = this.decoderRegistry.getDecoder(pattern.type);
        
        if (!decoder) {
          this.logger.warn(`No decoder found for type: ${pattern.type}`);
          continue;
        }
        
        // Apply the decoder
        try {
          this.logger.debug(`Applying ${pattern.type} decoder to pattern at position ${pattern.start}-${pattern.end}`);
          const decodedContent = decoder.decode(pattern.content, pattern.metadata);
          
          // Replace the original content with the decoded content
          const beforePattern = processedHtml.substring(0, pattern.start);
          const afterPattern = processedHtml.substring(pattern.end);
          
          // Optionally preserve the raw link in a comment
          let replacement = decodedContent;
          if (this.config.preserveRawLinks) {
            replacement = `<!-- Original: ${pattern.content} -->${decodedContent}`;
          }
          
          processedHtml = beforePattern + replacement + afterPattern;
          patternCount++;
        } catch (error) {
          // Log error but continue processing other patterns
          if (error instanceof Error) {
            this.logger.error(`Error applying ${pattern.type} decoder: ${error.message}`);
          } else {
            this.logger.error(`Unknown error applying ${pattern.type} decoder`);
          }
        }
      }
      
      this.logger.debug(`Deobfuscation process completed, processed ${patternCount} patterns`);
      return processedHtml;
    } catch (error) {
      this.logger.error('Error during deobfuscation');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return html; // Return original content on error
    }
  }
  
  /**
   * Clean deobfuscation scripts from HTML
   * @param html The HTML content to clean
   * @returns The cleaned HTML content
   */
  private cleanScripts(html: string): string {
    this.logger.debug('Cleaning deobfuscation scripts');
    
    try {
      // Remove Cloudflare email protection script
      const cleanedHtml = html.replace(
        /<script[^>]*data-cfasync[^>]*>[^<]*<\/script>/gi,
        ''
      ).replace(
        /<script[^>]*src[^>]*email-decode[^>]*>[^<]*<\/script>/gi,
        ''
      ).replace(
        /<script[^>]*>[^<]*email-protection[^<]*<\/script>/gi,
        ''
      );
      
      const scriptCount = 
        (html.match(/<script[^>]*data-cfasync[^>]*>/gi)?.length || 0) +
        (html.match(/<script[^>]*src[^>]*email-decode[^>]*>/gi)?.length || 0) +
        (html.match(/<script[^>]*>[^<]*email-protection[^<]*<\/script>/gi)?.length || 0);
      
      if (scriptCount > 0) {
        this.logger.debug(`Removed ${scriptCount} deobfuscation script(s)`);
      }
      
      return cleanedHtml;
    } catch (error) {
      this.logger.error('Error cleaning deobfuscation scripts');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return html; // Return original content on error
    }
  }
}