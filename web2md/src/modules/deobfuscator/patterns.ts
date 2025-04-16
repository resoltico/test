import { PatternMatch } from '../../types/core/deobfuscation.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Detects obfuscation patterns in HTML content
 */
export class PatternDetector {
  constructor(private logger: Logger) {}
  
  /**
   * Detect all obfuscation patterns in the content
   * @param content The HTML content to scan
   * @returns Array of detected patterns
   */
  detectPatterns(content: string): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    
    // Look for Cloudflare email protection
    this.detectCloudflareEmailPatterns(content, patterns);
    
    // Look for base64 encoded content
    this.detectBase64Patterns(content, patterns);
    
    // Look for ROT13 encoded content
    this.detectROT13Patterns(content, patterns);
    
    this.logger.debug(`Detected ${patterns.length} obfuscation patterns`);
    return patterns;
  }
  
  /**
   * Detect Cloudflare email protection patterns
   * @param content The HTML content to scan
   * @param patterns Array to add detected patterns to
   */
  private detectCloudflareEmailPatterns(content: string, patterns: PatternMatch[]): void {
    // Look for Cloudflare script
    if (content.includes('email-protection') || content.includes('/cdn-cgi/l/email-protection')) {
      this.logger.debug('Detected Cloudflare email protection script');
      
      // Look for encoded email addresses
      const emailRegex = /<a[^>]+href\s*=\s*["']\/cdn-cgi\/l\/email-protection#([a-zA-Z0-9]+)["'][^>]*>/g;
      let match;
      
      while ((match = emailRegex.exec(content)) !== null) {
        patterns.push({
          type: 'cloudflare',
          content: match[0],
          start: match.index,
          end: match.index + match[0].length,
          metadata: {
            encoded: match[1]
          }
        });
      }
      
      // Look for encoded email spans
      const spanRegex = /<span[^>]+class\s*=\s*["']__cf_email__["'][^>]+data-cfemail\s*=\s*["']([a-zA-Z0-9]+)["'][^>]*>/g;
      
      while ((match = spanRegex.exec(content)) !== null) {
        patterns.push({
          type: 'cloudflare',
          content: match[0],
          start: match.index,
          end: match.index + match[0].length,
          metadata: {
            encoded: match[1]
          }
        });
      }
    }
  }
  
  /**
   * Detect base64 encoded content
   * @param content The HTML content to scan
   * @param patterns Array to add detected patterns to
   */
  private detectBase64Patterns(content: string, patterns: PatternMatch[]): void {
    // Look for data: URLs with base64 encoding
    const base64Regex = /data:[^;]+;base64,([a-zA-Z0-9+/=]+)/g;
    let match;
    
    while ((match = base64Regex.exec(content)) !== null) {
      patterns.push({
        type: 'base64',
        content: match[0],
        start: match.index,
        end: match.index + match[0].length,
        metadata: {
          encoded: match[1]
        }
      });
    }
    
    // Look for potential base64 encoded attributes
    const attributeRegex = /(?:href|src|data-\w+)\s*=\s*["']([a-zA-Z0-9+/=]{40,})["']/g;
    
    while ((match = attributeRegex.exec(content)) !== null) {
      // Simple heuristic: if it looks like base64 (only valid chars and reasonable length)
      const encoded = match[1];
      if (/^[a-zA-Z0-9+/=]+$/.test(encoded) && encoded.length % 4 === 0) {
        patterns.push({
          type: 'base64',
          content: match[0],
          start: match.index,
          end: match.index + match[0].length,
          metadata: {
            encoded
          }
        });
      }
    }
  }
  
  /**
   * Detect ROT13 encoded content
   * @param content The HTML content to scan
   * @param patterns Array to add detected patterns to
   */
  private detectROT13Patterns(content: string, patterns: PatternMatch[]): void {
    // Look for elements with ROT13 class or data attribute
    const rot13Regex = /<[^>]+(?:class\s*=\s*["'][^"']*rot13[^"']*["']|data-rot13\s*=\s*["'][^"']+["'])[^>]*>([^<]+)<\/[^>]+>/g;
    let match;
    
    while ((match = rot13Regex.exec(content)) !== null) {
      patterns.push({
        type: 'rot13',
        content: match[0],
        start: match.index,
        end: match.index + match[0].length,
        metadata: {
          encoded: match[1]
        }
      });
    }
  }
}
