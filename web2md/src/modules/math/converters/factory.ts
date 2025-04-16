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
  private aliases = new Map<string, string>();
  
  constructor(private logger: Logger) {
    // Register default converters
    this.registerConverterType('latex', (logger) => new LaTeXConverter(logger));
    this.registerAlias('tex', 'latex');
    this.registerAlias('mathjax', 'latex');
    this.registerAlias('katex', 'latex');
    
    this.registerConverterType('mathml', (logger) => new MathMLConverter(logger));
    this.registerAlias('mml', 'mathml');
    
    this.registerConverterType('ascii', (logger) => new ASCIIMathConverter(logger));
    this.registerAlias('asciimath', 'ascii');
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
   * Register an alias for an existing format
   * @param alias The alias name
   * @param targetFormat The target format name
   */
  registerAlias(alias: string, targetFormat: string): void {
    const normalizedAlias = alias.toLowerCase();
    const normalizedTarget = targetFormat.toLowerCase();
    
    if (!this.converters.has(normalizedTarget)) {
      this.logger.warn(`Cannot create alias '${normalizedAlias}' for non-existent format '${normalizedTarget}'`);
      return;
    }
    
    this.aliases.set(normalizedAlias, normalizedTarget);
    this.logger.debug(`Registered alias '${normalizedAlias}' for format '${normalizedTarget}'`);
  }
  
  /**
   * Create a converter for the specified format
   * @param format The format to create a converter for
   * @returns A converter instance or undefined if not found
   */
  createConverter(format: string): MathConverter | undefined {
    const normalizedFormat = format.toLowerCase();
    
    // Resolve any aliases
    const resolvedFormat = this.resolveAlias(normalizedFormat);
    
    // Get the factory
    const factory = this.converters.get(resolvedFormat);
    
    if (!factory) {
      this.logger.warn(`No converter factory found for format: ${normalizedFormat}`);
      
      // Try to use LaTeX as fallback for unknown formats
      if (resolvedFormat !== 'latex') {
        this.logger.debug(`Trying to use LaTeX converter as fallback for format: ${normalizedFormat}`);
        return this.createConverter('latex');
      }
      
      return undefined;
    }
    
    try {
      const converter = factory(this.logger);
      return converter;
    } catch (error) {
      this.logger.error(`Error creating converter for format ${resolvedFormat}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  /**
   * Resolve an alias to its target format
   * @param format The format or alias
   * @returns The resolved format
   */
  private resolveAlias(format: string): string {
    // Check if this is an alias
    if (this.aliases.has(format)) {
      const target = this.aliases.get(format)!;
      this.logger.debug(`Resolved alias '${format}' to format '${target}'`);
      return target;
    }
    
    // Not an alias, return as is
    return format;
  }
  
  /**
   * Get a list of all supported formats (including aliases)
   * @returns Array of supported format names
   */
  getSupportedFormats(): string[] {
    const primaryFormats = Array.from(this.converters.keys());
    const aliasFormats = Array.from(this.aliases.keys());
    return [...primaryFormats, ...aliasFormats];
  }
  
  /**
   * Get a list of primary formats (excluding aliases)
   * @returns Array of primary format names
   */
  getPrimaryFormats(): string[] {
    return Array.from(this.converters.keys());
  }
  
  /**
   * Check if a format is supported
   * @param format The format to check
   * @returns Whether the format is supported
   */
  isFormatSupported(format: string): boolean {
    const normalizedFormat = format.toLowerCase();
    return this.converters.has(normalizedFormat) || this.aliases.has(normalizedFormat);
  }
  
  /**
   * Create a custom converter for a specific format
   * This is useful for one-off conversions without registering a new converter type
   * @param format Target format
   * @param conversionFn Custom conversion function
   * @returns A new converter instance
   */
  createCustomConverter(
    format: string, 
    conversionFn: (content: string, isDisplay: boolean) => Promise<string>
  ): MathConverter {
    this.logger.debug(`Creating custom converter for format: ${format}`);
    
    const CustomConverter = class extends MathConverter {
      constructor(logger: Logger) {
        super(logger);
      }
      
      async convert(content: string, context: {isDisplay: boolean}): Promise<string> {
        return conversionFn(content, context.isDisplay);
      }
    };
    
    return new CustomConverter(this.logger);
  }
}