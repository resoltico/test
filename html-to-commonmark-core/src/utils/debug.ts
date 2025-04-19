/**
 * Enhanced debug utilities for the HTML-to-CommonMark converter
 * Provides instrumentation, tracing, and visualization to diagnose conversion issues
 */

import { ASTNode, isParentNode } from '../ast/types.js';
import { HtmlNode, isElementNode, isTextNode } from '../types/html.js';

/**
 * Debug configuration options
 */
export interface DebugOptions {
  /**
   * Whether debug mode is enabled
   */
  enabled?: boolean;
  
  /**
   * Whether to enable verbose logging
   */
  verbose?: boolean;
  
  /**
   * Maximum depth for object serialization
   */
  maxDepth?: number;
  
  /**
   * Whether to record trace logs
   */
  tracing?: boolean;
  
  /**
   * File or console output target
   */
  output?: 'console' | 'file';
  
  /**
   * Output file path (if output is 'file')
   */
  outputFile?: string;
}

/**
 * Global debug state
 */
interface DebugState {
  enabled: boolean;
  verbose: boolean;
  maxDepth: number;
  tracing: boolean;
  output: 'console' | 'file';
  outputFile: string;
  traceDepth: number;
  traceLog: TraceEntry[];
}

/**
 * Trace log entry
 */
interface TraceEntry {
  timestamp: Date;
  type: 'info' | 'warn' | 'error' | 'success' | 'trace';
  message: string;
  depth: number;
  data: any;
}

/**
 * Default debug configuration
 */
const DEFAULT_CONFIG: DebugState = {
  enabled: false,
  verbose: false,
  maxDepth: 4,
  tracing: false,
  output: 'console',
  outputFile: 'debug.log',
  traceDepth: 0,
  traceLog: [],
};

/**
 * Current debug state
 */
let debugState: DebugState = { ...DEFAULT_CONFIG };

/**
 * Terminal colors for different message types
 */
const COLORS = {
  info: '\x1b[36m', // Cyan
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  success: '\x1b[32m', // Green
  trace: '\x1b[35m', // Magenta
  reset: '\x1b[0m' // Reset
};

/**
 * Configure debug settings
 * @param options Debug configuration options
 */
export function configureDebug(options: DebugOptions = {}): void {
  // Update state with provided options
  debugState = {
    ...debugState,
    ...options,
  };
  
  if (debugState.enabled) {
    console.log('🐛 Debug mode enabled');
    if (debugState.verbose) {
      console.log('📊 Verbose logging enabled');
    }
    if (debugState.tracing) {
      console.log('🔍 Trace logging enabled');
    }
  }
}

/**
 * Enable or disable debug mode
 * @param enabled Whether to enable debug mode
 */
export function enableDebug(enabled: boolean = true): void {
  debugState.enabled = enabled;
  if (enabled) {
    console.log('🐛 Debug mode enabled');
  } else {
    console.log('⚪ Debug mode disabled');
  }
}

/**
 * Log a debug message
 * @param message Message to log
 * @param type Message type/level
 * @param data Optional data to log
 */
export function debugLog(message: string, type: 'info' | 'warn' | 'error' | 'success' | 'trace' = 'info', data: any = null): void {
  if (!debugState.enabled) return;
  
  const padding = ' '.repeat(debugState.traceDepth * 2);
  const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
  
  // Output to console
  if (debugState.output === 'console') {
    console.log(`${COLORS[type]}[${timestamp}]${padding}${message}${COLORS.reset}`);
    
    if (data !== null && debugState.verbose) {
      console.dir(data, { depth: debugState.maxDepth, colors: true });
    }
  }
  
  // Record in trace log if tracing is enabled
  if (debugState.tracing) {
    debugState.traceLog.push({
      timestamp: new Date(),
      type,
      message,
      depth: debugState.traceDepth,
      data: data ? safelySerializeData(data) : null
    });
  }
}

/**
 * Safely serialize data for the trace log
 * @param data Data to serialize
 * @returns Serializable version of the data
 */
function safelySerializeData(data: any): any {
  try {
    // Use JSON parse/stringify to create a safe copy
    return JSON.parse(JSON.stringify(data, safeJsonReplacer));
  } catch (error) {
    return { serialization_error: String(error) };
  }
}

/**
 * Safe JSON replacer function that handles circular references
 */
function safeJsonReplacer(key: string, value: any): any {
  // Handle circular references in the AST
  if (key === 'parent') {
    return value ? { type: value.type } : null;
  }
  
  // Handle special object types
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (value instanceof Set) {
    return [...value];
  }
  if (value instanceof Error) {
    return { 
      name: value.name, 
      message: value.message, 
      stack: value.stack 
    };
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  
  return value;
}

/**
 * Create a traced version of a function
 * @param fn Function to trace
 * @param name Function name
 * @returns Traced function
 */
export function trace<T extends Function>(fn: T, name: string = fn.name): T {
  if (!debugState.enabled || !debugState.tracing) return fn;
  
  const traced = function(this: any, ...args: any[]) {
    debugLog(`▶️ Enter: ${name}`, 'trace');
    debugState.traceDepth++;
    
    try {
      const result = fn.apply(this, args);
      
      // For async functions (Promise results)
      if (result instanceof Promise) {
        return result.then(
          (value) => {
            debugState.traceDepth--;
            debugLog(`⬅️ Exit: ${name}`, 'trace');
            return value;
          },
          (error) => {
            debugState.traceDepth--;
            debugLog(`❌ Error in ${name}: ${error.message}`, 'error', error);
            throw error;
          }
        );
      }
      
      // For synchronous functions
      debugState.traceDepth--;
      debugLog(`⬅️ Exit: ${name}`, 'trace');
      return result;
    } catch (error) {
      debugState.traceDepth--;
      debugLog(`❌ Error in ${name}: ${error instanceof Error ? error.message : String(error)}`, 'error', error);
      throw error;
    }
  } as unknown as T;
  
  return traced;
}

/**
 * Instrument an object by wrapping all its methods with tracing
 * @param obj Object to instrument
 * @param objName Name of the object (for logging)
 * @returns Instrumented object
 */
export function instrument<T extends object>(obj: T, objName: string): T {
  if (!debugState.enabled || !debugState.tracing) return obj;
  
  const instrumented = { ...obj };
  
  // Get all methods from the object and its prototype
  const methods = [
    ...Object.getOwnPropertyNames(obj),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
  ].filter(name => {
    return typeof (obj as any)[name] === 'function' && name !== 'constructor';
  });
  
  // Instrument each method
  for (const methodName of methods) {
    (instrumented as any)[methodName] = trace((obj as any)[methodName], `${objName}.${methodName}`);
  }
  
  return instrumented;
}

/**
 * Create a visual representation of an AST
 * @param node AST node or nodes
 * @param maxDepth Maximum depth to visualize
 * @returns String representation of the AST
 */
export function visualizeAst(node: ASTNode | ASTNode[], maxDepth: number = 10): string {
  if (!node) return 'null';
  
  const nodes = Array.isArray(node) ? node : [node];
  return nodes.map(n => visualizeNode(n, 0, maxDepth)).join('\n');
}

/**
 * Visualize a single AST node
 * @param node Node to visualize
 * @param depth Current depth
 * @param maxDepth Maximum depth
 * @returns String representation of the node
 */
function visualizeNode(node: ASTNode, depth: number = 0, maxDepth: number = 10): string {
  if (!node) return '';
  if (depth > maxDepth) return '  '.repeat(depth) + '...';
  
  const padding = '  '.repeat(depth);
  let result = `${padding}${node.type}`;
  
  // Add node-specific properties
  switch (node.type) {
    case 'Heading':
      result += ` (level=${(node as any).level})`;
      break;
    case 'List':
      result += ` (ordered=${(node as any).ordered})`;
      break;
    case 'Image':
      result += ` (url=${(node as any).url}, alt=${(node as any).alt || ''})`;
      break;
    case 'Link':
      result += ` (url=${(node as any).url})`;
      break;
    case 'Text':
      const value = (node as any).value || '';
      const truncatedValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
      result += ` (value="${truncatedValue}")`;
      break;
  }
  
  // Add children if this is a parent node
  if (isParentNode(node) && node.children && node.children.length > 0) {
    result += ` [${node.children.length} children]`;
    for (const child of node.children) {
      result += '\n' + visualizeNode(child, depth + 1, maxDepth);
    }
  }
  
  return result;
}

/**
 * Dump the current trace log
 * @returns The trace log as a formatted string
 */
export function dumpTraceLog(): string {
  if (!debugState.tracing || debugState.traceLog.length === 0) {
    return 'No trace log available';
  }
  
  // Format the trace log as a string
  const logLines: string[] = ['Trace Log:'];
  
  for (const entry of debugState.traceLog) {
    const timestamp = entry.timestamp.toISOString().substring(11, 23);
    const padding = ' '.repeat(entry.depth * 2);
    const prefix = `[${timestamp}] ${padding}`;
    
    logLines.push(`${prefix}${entry.type.toUpperCase()}: ${entry.message}`);
    
    if (entry.data !== null) {
      const dataLines = JSON.stringify(entry.data, null, 2)
        .split('\n')
        .map(line => `${padding}  ${line}`);
      
      logLines.push(...dataLines);
    }
  }
  
  return logLines.join('\n');
}

/**
 * Reset the trace log
 */
export function resetTraceLog(): void {
  debugState.traceLog = [];
  debugState.traceDepth = 0;
}

/**
 * Create a visual representation of an HTML node
 * @param node HTML node
 * @param maxDepth Maximum depth to visualize
 * @returns String representation of the HTML node
 */
export function visualizeHtml(node: HtmlNode | null, maxDepth: number = 10): string {
  if (!node) return 'null';
  
  return visualizeHtmlNode(node, 0, maxDepth);
}

/**
 * Visualize a single HTML node
 * @param node Node to visualize
 * @param depth Current depth
 * @param maxDepth Maximum depth
 * @returns String representation of the node
 */
function visualizeHtmlNode(node: HtmlNode, depth: number = 0, maxDepth: number = 10): string {
  if (!node) return '';
  if (depth > maxDepth) return '  '.repeat(depth) + '...';
  
  const padding = '  '.repeat(depth);
  let result = `${padding}${node.nodeType}: ${node.nodeName}`;
  
  // Add type-specific properties
  if (isElementNode(node)) {
    result += ` <${node.tagName.toLowerCase()}>`;
    
    // Add attributes
    if (node.attributes.size > 0) {
      const attrs = Array.from(node.attributes.entries())
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      
      result += ` (${attrs})`;
    }
    
    // Add children
    if (node.childNodes.length > 0) {
      result += ` [${node.childNodes.length} children]`;
      for (const child of node.childNodes) {
        result += '\n' + visualizeHtmlNode(child, depth + 1, maxDepth);
      }
    }
  } else if (isTextNode(node)) {
    const content = node.data.trim();
    if (content) {
      const truncatedContent = content.length > 30 
        ? content.substring(0, 27) + '...' 
        : content;
      result += ` "${truncatedContent}"`;
    } else {
      result += ' [empty]';
    }
  }
  
  return result;
}