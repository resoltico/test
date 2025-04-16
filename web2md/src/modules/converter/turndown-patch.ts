import { Logger } from '../../shared/logger/console.js';

/**
 * Patch for Turndown to preserve our math placeholders
 */
export function patchTurndownService(turndownService: any, logger: Logger, placeholders: string[]): void {
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
    filter: (node: any) => {
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