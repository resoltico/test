import { JSDOM } from 'jsdom';

/**
 * Processes HTML content to ensure links are preserved exactly as they appear in the original
 * @param html The HTML content containing links
 * @returns HTML with preserved links
 */
export function preserveLinks(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find all <a> elements
  const linkElements = document.querySelectorAll('a');
  
  for (const linkElement of linkElements) {
    const href = linkElement.getAttribute('href');
    
    if (href) {
      // Mark this link to ensure it doesn't get sanitized
      linkElement.setAttribute('data-preserve-href', 'true');
      
      // Store the original href
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
  
  // This is a simplified approach - in reality we would need to maintain a mapping
  // of original hrefs to ensure accurate restoration
  return markdown.replace(linkPattern, (match: string, text: string, url: string) => {
    // If URL was encoded or modified, we would restore it here
    // For now, just preserving the match as-is
    return match;
  });
}
