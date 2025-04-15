/**
 * DOM-related type declarations for Node.js environment
 * 
 * These declarations help bridge the gap between browser DOM types
 * and Node.js environment, especially when working with JSDOM.
 */

// Explicitly reference DOM lib
/// <reference lib="dom" />

// Re-export Node type for use throughout the application
export type DOMNode = globalThis.Node;
export type DOMElement = globalThis.Element;
export type DOMDocument = globalThis.Document;
