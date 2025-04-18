/**
 * Utility functions for escaping special characters in markdown
 */

/**
 * Characters that need to be escaped in markdown
 */
const MARKDOWN_CHARS = /([\\`*_{}[\]()#+\-.!|])/g;

/**
 * URLs that need additional escaping
 */
const URL_UNSAFE_CHARS = /[\s<>]/g;

/**
 * Escapes special markdown characters
 * @param text Text to escape
 * @returns Escaped text
 */
export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_CHARS, '\\$1');
}

/**
 * Escapes unsafe characters in URLs
 * @param url URL to escape
 * @returns Escaped URL
 */
export function escapeUrl(url: string): string {
  return encodeURI(url).replace(URL_UNSAFE_CHARS, encodeURIComponent);
}

/**
 * Escapes HTML characters
 * @param html HTML string to escape
 * @returns Escaped HTML
 */
export function escapeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unescapes HTML entities
 * @param html HTML string with entities
 * @returns Unescaped HTML
 */
export function unescapeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}