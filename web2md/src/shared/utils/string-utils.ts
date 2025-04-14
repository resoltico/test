/**
 * String manipulation utilities
 */

/**
 * Sanitizes a string to be used as a filename
 * @param input The string to sanitize
 * @returns A sanitized string safe for use as a filename
 */
export function sanitizeFilename(input: string): string {
  // Replace unsafe characters with underscores
  return input
    .replace(/[<>:"/\\|?*]/g, '_') // Replace unsafe characters
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .trim();
}

/**
 * Ensures a string ends with a specified suffix
 * @param str The string to check
 * @param suffix The suffix that should be at the end of the string
 * @returns The original string with the suffix if needed
 */
export function ensureEndsWith(str: string, suffix: string): string {
  return str.endsWith(suffix) ? str : `${str}${suffix}`;
}

/**
 * Converts a string to a valid filename by sanitizing and keeping only alphanumeric chars
 * @param input The string to convert
 * @returns A valid filename
 */
export function toValidFilename(input: string): string {
  // Strip any path elements
  const baseName = input.split('/').pop()?.split('\\').pop() || input;
  
  // Remove any query parameters or fragment identifiers
  const withoutQuery = baseName.split('?')[0].split('#')[0];
  
  // Sanitize the remaining string
  return sanitizeFilename(withoutQuery);
}
