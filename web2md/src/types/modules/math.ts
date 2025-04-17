/**
 * Options for the math processor
 */
export interface MathProcessorOptions {
  /**
   * Delimiter for inline math
   */
  inlineDelimiter: string;
  
  /**
   * Delimiter for block math
   */
  blockDelimiter: string;
  
  /**
   * Whether to preserve original math content
   */
  preserveOriginal: boolean;
  
  /**
   * Format to use for math output
   */
  outputFormat: string;
  
  /**
   * Custom element selectors to identify math content
   */
  selectors: {
    mathml?: string;
    scripts?: string;
    dataAttributes?: string;
    classes?: string;
    attributes?: string;
  };
}

/**
 * Math processing result
 */
export interface MathProcessingResult {
  /**
   * The HTML with math content extracted and replaced with placeholders
   */
  html: string;
  
  /**
   * Function to restore math content in Markdown
   */
  restoreMarkdown: (markdown: string) => Promise<string>;
  
  /**
   * Debug info - for troubleshooting
   */
  debug?: {
    placeholderCount: number;
    placeholders: string[];
    displayCount?: number;
    inlineCount?: number;
  };
}

/**
 * Interface for a math extraction result
 */
export interface MathExtraction {
  /**
   * Map of placeholders to their original math content
   */
  placeholderMap: Map<string, {
    content: string;
    isDisplay: boolean;
    format: string;
  }>;
  
  /**
   * The processed HTML with placeholders
   */
  html: string;
}

/**
 * Options for the math extractor
 */
export interface MathExtractorOptions {
  /**
   * Delimiter for inline math
   */
  inlineDelimiter: string;
  
  /**
   * Delimiter for block math
   */
  blockDelimiter: string;
  
  /**
   * Custom element selectors to identify math content
   */
  selectors: Record<string, string>;
}

/**
 * Options for the math restorer
 */
export interface MathRestorerOptions {
  /**
   * Delimiter for inline math
   */
  inlineDelimiter: string;
  
  /**
   * Delimiter for block math
   */
  blockDelimiter: string;
  
  /**
   * Format to use for math output
   */
  outputFormat: string;
}

/**
 * Conversion context for math processing
 */
export interface ConversionContext {
  /**
   * Original format of the content
   */
  sourceFormat: string;
  
  /**
   * Whether the math should be displayed in block mode
   */
  isDisplay: boolean;
  
  /**
   * The original element (if available)
   * This allows accessing attributes and other DOM information
   */
  element?: Element;
  
  /**
   * Additional options for the conversion
   */
  options?: Record<string, any>;
}