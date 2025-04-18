/**
 * Renderer options
 */

/**
 * Options for Markdown rendering
 */
export interface RenderOptions {
  /**
   * Heading style
   * - 'atx': # Heading
   * - 'atx-closed': # Heading #
   * - 'setext': Heading
   *             =======
   */
  headingStyle?: 'atx' | 'atx-closed' | 'setext';
  
  /**
   * Bullet marker for unordered lists
   */
  bulletMarker?: '-' | '*' | '+';
  
  /**
   * Marker for ordered lists
   */
  orderedMarker?: '1.' | '1)';
  
  /**
   * Indentation size (number of spaces)
   */
  indentSize?: number;
  
  /**
   * Whether to escape pipe characters in tables
   */
  escapePipeInTables?: boolean;
  
  /**
   * How to render soft breaks
   * - 'space': Single space
   * - 'newline': Line break
   */
  softBreak?: 'space' | 'newline';
  
  /**
   * Delimiter for emphasis
   */
  emphasisDelimiter?: '*' | '_';
  
  /**
   * Delimiter for strong emphasis
   */
  strongDelimiter?: '**' | '__';
  
  /**
   * Marker for fenced code blocks
   */
  fencedCodeMarker?: '```' | '~~~';
  
  /**
   * Marker for thematic breaks
   */
  thematicBreakMarker?: '---' | '***' | '___';
  
  /**
   * Allow HTML tags to be preserved
   */
  preserveHtml?: boolean;
  
  /**
   * Preferred line length for wrapping paragraphs
   * Set to 0 to disable wrapping
   */
  preferredLineLength?: number;
}

/**
 * Default render options
 */
export const DEFAULT_OPTIONS: RenderOptions = {
  headingStyle: 'atx',
  bulletMarker: '-',
  orderedMarker: '1.',
  indentSize: 2,
  escapePipeInTables: true,
  softBreak: 'space',
  emphasisDelimiter: '*',
  strongDelimiter: '**',
  fencedCodeMarker: '```',
  thematicBreakMarker: '---',
  preserveHtml: true,
  preferredLineLength: 0,
};