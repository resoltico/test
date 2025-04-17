/**
 * Placeholder format to use in the HTML
 * Using a distinctive format that won't be confused with regular content
 */
export const PLACEHOLDER_FORMAT = '%%MATH_PLACEHOLDER_%d%%';

/**
 * Pattern to match placeholder in Markdown
 * Creating it from the PLACEHOLDER_FORMAT with a regex for the dynamic parts
 */
export const PLACEHOLDER_PATTERN_REGEX = new RegExp(
  PLACEHOLDER_FORMAT.replace('%d', '(\\d+)'), 
  'g'
);

/**
 * Also check for unformatted placeholders (without %%)
 */
export const UNFORMATTED_PLACEHOLDER_PATTERN = /MATH_PLACEHOLDER_(\d+)/g;