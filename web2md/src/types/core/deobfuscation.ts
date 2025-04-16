/**
 * Interface for deobfuscation pattern detection
 */
export interface PatternMatch {
  /**
   * Type of obfuscation pattern detected
   */
  type: string;
  
  /**
   * The raw obfuscated content
   */
  content: string;
  
  /**
   * Start position in the original content
   */
  start: number;
  
  /**
   * End position in the original content
   */
  end: number;
  
  /**
   * Additional metadata for the decoder
   */
  metadata?: Record<string, unknown>;
}

/**
 * Decoder for obfuscated content
 */
export interface Decoder {
  /**
   * Unique identifier for the decoder
   */
  type: string;
  
  /**
   * Decode obfuscated content
   */
  decode(content: string, metadata?: Record<string, unknown>): string;
}

/**
 * Result of deobfuscation
 */
export interface DeobfuscationResult {
  /**
   * The deobfuscated content
   */
  content: string;
  
  /**
   * Original pattern match
   */
  pattern: PatternMatch;
  
  /**
   * Whether the deobfuscation was successful
   */
  success: boolean;
}
