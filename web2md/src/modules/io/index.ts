/**
 * IO module exports
 */
export { FileReader, URLReader } from './reader.js';
export { OutputWriter } from './writer.js';
export { FileSystemAdapter } from './adapters/fs-adapter.js';
export { HttpAdapter } from './adapters/http-adapter.js';
export type { FileSystemInterface, HttpInterface } from './types.js';
