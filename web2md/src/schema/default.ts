/**
 * Default Schema
 * 
 * Provides a default schema that offers sensible defaults for HTML to Markdown conversion.
 */

import { Schema } from './validation.js';

/**
 * The default schema for web2md
 */
export const defaultSchema: Schema = {
  // Default rules
  rules: [
    // Code blocks
    {
      selector: "pre",
      action: "codeBlock",
      options: {
        // Language will be detected from the class if present
      }
    },
    // Code elements
    {
      selector: "code",
      action: "transform",
      options: {
        // No special options needed
      }
    },
    // Tables
    {
      selector: "table",
      action: "transform",
      options: {
        withHeader: true,
        includeCaption: true
      }
    },
    // Blockquotes
    {
      selector: "blockquote",
      action: "transform",
      options: {
        // No special options needed
      }
    }
  ],
  
  // Global settings for Markdown output
  global: {
    headingStyle: "atx",
    bulletListMarker: "-",
    emphasis: "*",
    strong: "**",
    fence: "```",
    fences: true,
    incrementListMarker: true,
    listItemIndent: "one",
    setext: false
  },
  
  // Elements to remove by default
  remove: [
    "script",
    "noscript",
    "style",
    "iframe",
    "div.advertisement",
    "div.ad",
    "div.ads",
    "aside.sidebar"
  ],
  
  // No elements are kept as HTML by default
  keep: []
};