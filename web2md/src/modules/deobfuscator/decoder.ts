import { Decoder } from '../../types/core/deobfuscation.js';

/**
 * Registry for decoders
 */
export class DecoderRegistry {
  private decoders = new Map<string, Decoder>();
  
  /**
   * Register a decoder
   * @param decoder The decoder to register
   */
  register(decoder: Decoder): void {
    this.decoders.set(decoder.type, decoder);
  }
  
  /**
   * Get a decoder by type
   * @param type The type of decoder to get
   * @returns The decoder or undefined if not found
   */
  getDecoder(type: string): Decoder | undefined {
    return this.decoders.get(type);
  }
  
  /**
   * Check if a decoder type is registered
   * @param type The type to check
   * @returns Whether the decoder type is registered
   */
  hasDecoder(type: string): boolean {
    return this.decoders.has(type);
  }
  
  /**
   * Get all registered decoder types
   * @returns Array of decoder types
   */
  getDecoderTypes(): string[] {
    return Array.from(this.decoders.keys());
  }
}
