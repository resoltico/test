import { JSDOM } from 'jsdom';

/**
 * Map to store original links for restoration
 * This is a module-level variable to maintain state between preprocessing and post-processing
 */
const originalLinks = new Map<string, string>();

/**
 * Processes HTML content to ensure links are preserved exactly as they appear in the original
 * @param html The HTML content containing links
 * @returns HTML with preserved links
 */
export function preserveLinks(html: string): string {
  // Clear any previous links
  originalLinks.clear();
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find all <a> elements
  const linkElements = document.querySelectorAll('a');
  let linkCounter = 0;
  
  for (const linkElement of linkElements) {
    const href = linkElement.getAttribute('href');
    
    if (href) {
      // Generate a unique ID for this link
      const linkId = `link-${linkCounter++}`;
      
      // Store the original href with the ID as the key
      originalLinks.set(linkId, href);
      
      // Mark this link with the ID
      linkElement.setAttribute('data-original-link-id', linkId);
      
      // Keep the original href as well
      linkElement.setAttribute('data-original-href', href);
    }
  }
  
  return dom.serialize();
}

/**
 * Restores links in Markdown content based on original href values
 * @param markdown The Markdown content with links
 * @returns Markdown with original link URLs
 */
export function restoreLinks(markdown: string): string {
  // Pattern to match Markdown links
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Replace links with their original values
  return markdown.replace(linkPattern, (match: string, text: string, url: string) => {
    // Check if this URL contains a link ID
    const idMatch = url.match(/data-original-link-id="([^"]+)"/);
    
    if (idMatch) {
      const linkId = idMatch[1];
      const originalHref = originalLinks.get(linkId);
      
      if (originalHref) {
        return `[${text}](${originalHref})`;
      }
    }
    
    // Check for specific encoded patterns and restore them
    if (url.includes('/cdn-cgi/l/email-protection')) {
      // This is likely an encoded email link
      // Try to find the corresponding original link
      for (const [, originalHref] of originalLinks.entries()) {
        if (originalHref.startsWith('mailto:')) {
          return `[${text}](${originalHref})`;
        }
      }
    }
    
    // For other links, use the original URL if available
    const decodedUrl = url.replace(/&amp;/g, '&');
    
    return `[${text}](${decodedUrl})`;
  });
}

/**
 * Pre-processes links in HTML before converting to Markdown
 * This is more robust than just preserving links
 * @param html The HTML content
 * @returns HTML with prepared links
 */
export function preprocessLinks(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find all <a> elements
  const linkElements = document.querySelectorAll('a');
  let linkCounter = 0;
  
  for (const linkElement of linkElements) {
    const href = linkElement.getAttribute('href');
    
    if (href) {
      // Generate a unique ID for this link
      const linkId = `link-${linkCounter++}`;
      
      // Store the original href
      originalLinks.set(linkId, href);
      
      // Replace the href with a special placeholder that won't be modified by Turndown
      const placeholderHref = `PRESERVE_LINK:${linkId}`;
      linkElement.setAttribute('href', placeholderHref);
      
      // Add data attributes to help with recognition
      linkElement.setAttribute('data-original-link-id', linkId);
      linkElement.setAttribute('data-original-href', href);
    }
  }
  
  return dom.serialize();
}

/**
 * Post-processes Markdown content to restore original links
 * @param markdown The Markdown content with placeholder links
 * @returns Markdown with restored original links
 */
export function postprocessLinks(markdown: string): string {
  // Pattern to match Markdown links with our placeholder
  const placeholderPattern = /\[([^\]]+)\]\(PRESERVE_LINK:([^)]+)\)/g;
  
  // Replace placeholder links with their original values
  return markdown.replace(placeholderPattern, (match: string, text: string, linkId: string) => {
    const originalHref = originalLinks.get(linkId);
    
    if (originalHref) {
      return `[${text}](${originalHref})`;
    }
    
    // If we can't find the original, just return the match
    return match;
  });
}
