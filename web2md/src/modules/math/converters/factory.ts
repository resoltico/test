import { Logger } from '../../../shared/logger/console.js';
import { MathConverter } from './base.js';
import { LaTeXConverter } from './latex.js';
import { MathMLConverter } from './mathml.js';
import { ASCIIMathConverter } from './ascii.js';

/**
 * Factory for creating math format converters
 * This allows for runtime registration of new converters
 */
export class MathConverterFactory {
  private converters = new Map<string, (logger: Logger) => MathConverter>();
  
  constructor(private logger: Logger) {
    // Register default converters
    this.registerConverterType('latex', (logger) => new LaTeXConverter(logger));
    this.registerConverterType('tex', (logger) => new LaTeXConverter(logger));
    this.registerConverterType('mathml', (logger) => new MathMLConverter(logger));
    this.registerConverterType('ascii', (logger) => new ASCIIMathConverter(logger));
    this.registerConverterType('asciimath', (logger) => new ASCIIMathConverter(logger));
  }
  
  /**
   * Register a new converter type
   * @param formatName Name of the format this converter handles
   * @param factory Factory function to create the converter
   */
  registerConverterType(formatName: string, factory: (logger: Logger) => MathConverter): void {
    const normalizedName = formatName.toLowerCase();
    this.converters.set(normalizedName, factory);
    this.logger.debug(`Registered math converter for format: ${normalizedName}`);
  }
  
  /**
   * Create a converter for the specified format
   * @param format The format to create a converter for
   * @returns A converter instance or undefined if not found
   */
  createConverter(format: string): MathConverter | undefined {
    const normalizedFormat = format.toLowerCase();
    const factory = this.converters.get(normalizedFormat);
    
    if (!factory) {
      this.logger.warn(`No converter factory found for format: ${normalizedFormat}`);
      return undefined;
    }
    
    try {
      const converter = factory(this.logger);
      return converter;
    } catch (error) {
      this.logger.error(`Error creating converter for format ${normalizedFormat}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  /**
   * Get a list of all supported formats
   * @returns Array of supported format names
   */
  getSupportedFormats(): string[] {
    return Array.from(this.converters.keys());
  }
  
  /**
   * Check if a format is supported
   * @param format The format to check
   * @returns Whether the format is supported
   */
  isFormatSupported(format: string): boolean {
    return this.converters.has(format.toLowerCase());
  }
}