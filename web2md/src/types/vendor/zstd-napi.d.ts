declare module 'zstd-napi' {
  /**
   * Compress data using Zstandard compression
   * @param input Data to compress (Buffer or string)
   * @param compressionLevel Optional compression level (1-22, default is 3)
   * @returns Compressed data as Buffer
   */
  export function compress(input: Buffer | string, compressionLevel?: number): Buffer;
  
  /**
   * Decompress Zstandard compressed data
   * @param input Compressed data as Buffer
   * @returns Decompressed data as Buffer
   * @throws Error if input is not valid Zstandard compressed data
   */
  export function decompress(input: Buffer): Buffer;
  
  /**
   * Get library version information
   * @returns Version information as string
   */
  export function version(): string;
  
  /**
   * Default export containing all functions
   */
  const zstd: {
    compress: typeof compress;
    decompress: typeof decompress;
    version: typeof version;
  };
  
  export default zstd;
}