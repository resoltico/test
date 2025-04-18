/**
 * Core engine for HTML to CommonMark conversion
 */

import { ASTNode } from '../ast/types.js';
import { parseHtml, ParserOptions } from './parser.js';
import { Walker, WalkerOptions } from './walker.js';
import { normalizeAst, NormalizerOptions } from '../ast/normalizer.js';
import { RenderOptions, DEFAULT_OPTIONS } from '../render/options.js';
import { renderMarkdown } from '../render/markdown.js';
import { RuleRegistry } from '../rules/registry.js';
import { TagRule } from '../rules/base.js';
import { ConversionError } from '../utils/errors.js';
import { EventEmitter } from '../utils/events.js';
import { allRules } from '../rules/index.js';
import { establishRelationships, verifyRelationships } from '../ast/relationship.js';

/**
 * Options for the conversion engine
 */
export interface EngineOptions {
  /**
   * Parser options
   */
  parser?: ParserOptions;
  
  /**
   * Walker options
   */
  walker?: Omit<WalkerOptions, 'ruleMap'>;
  
  /**
   * Normalizer options
   */
  normalizer?: NormalizerOptions;
  
  /**
   * Renderer options
   */
  renderer?: RenderOptions;
  
  /**
   * Whether to include debugging information
   */
  debug?: boolean;
  
  /**
   * Whether to establish relationships after AST generation
   */
  establishRelationships?: boolean;
  
  /**
   * Whether to verify relationships
   */
  verifyRelationships?: boolean;
}

/**
 * Debug timing information
 */
export interface DebugTiming {
  parseTime: number;
  walkTime: number;
  normalizeTime: number;
  renderTime: number;
  relationshipTime: number;
  totalTime: number;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  /**
   * The AST representation
   */
  ast: ASTNode[];
  
  /**
   * The markdown representation
   */
  markdown: string;
  
  /**
   * Debug information (if enabled)
   */
  debug?: DebugTiming;
}

/**
 * Conversion engine for HTML to CommonMark
 */
export class HtmlToCommonMarkEngine {
  /**
   * Rule registry
   */
  public readonly rules: RuleRegistry;
  
  /**
   * Event emitter for hooks
   */
  public readonly events: EventEmitter;
  
  /**
   * Engine options
   */
  private options: EngineOptions;
  
  /**
   * Store debug information between calls
   */
  private _lastDebugInfo?: DebugTiming;
  
  /**
   * Creates a new conversion engine
   * @param options Engine options
   * @param rules Initial rules
   */
  constructor(options: EngineOptions = {}, rules: TagRule[] = []) {
    this.options = {
      establishRelationships: true,
      verifyRelationships: true,
      ...options
    };
    
    // Initialize with all default rules
    this.rules = new RuleRegistry(allRules);
    
    // Add any custom rules
    if (rules.length > 0) {
      this.rules.registerAll(rules);
    }
    
    this.events = new EventEmitter();
    
    // Debugging output for rule registration
    if (this.options.debug) {
      console.log(`Initialized engine with ${this.rules.getRuleCount()} rules`);
      console.log(this.rules.dumpRules());
    }
  }
  
  /**
   * Converts HTML to an AST
   * @param html HTML string to convert
   * @returns AST representation
   */
  public async htmlToAst(html: string): Promise<ASTNode[]> {
    try {
      // Start time for debugging
      const startTime = this.options.debug ? Date.now() : 0;
      let parseTime = 0;
      let walkTime = 0;
      let normalizeTime = 0;
      let relationshipTime = 0;
      
      // Emit 'beforeParse' event
      await this.events.emit('beforeParse', html);
      
      // Parse the HTML
      const parseStartTime = this.options.debug ? Date.now() : 0;
      const dom = parseHtml(html, this.options.parser);
      if (this.options.debug) {
        parseTime = Date.now() - parseStartTime;
      }
      
      // Emit 'afterParse' event
      await this.events.emit('afterParse', dom);
      
      // Before creating the walker, ensure we have all rules
      if (this.options.debug) {
        console.log(`Creating walker with ${this.rules.getRuleCount()} rules`);
      }
      
      // Create the walker with relationship-aware options
      const walkStartTime = this.options.debug ? Date.now() : 0;
      const walker = new Walker({
        ruleMap: this.rules.getAllRules(),
        defaultRule: this.rules.getDefaultRule(),
        establishRelationships: this.options.establishRelationships,
        verifyRelationships: this.options.verifyRelationships,
        ...this.options.walker,
      });
      
      // Walk the DOM to create the AST
      const ast = walker.walk(dom);
      if (this.options.debug) {
        walkTime = Date.now() - walkStartTime;
      }
      
      // Emit 'beforeNormalize' event
      await this.events.emit('beforeNormalize', ast);
      
      // Normalize the AST with relationship-aware options
      const normalizeStartTime = this.options.debug ? Date.now() : 0;
      const normalizedAst = normalizeAst(ast, {
        verifyRelationships: this.options.verifyRelationships,
        ...this.options.normalizer
      });
      if (this.options.debug) {
        normalizeTime = Date.now() - normalizeStartTime;
      }
      
      // Emit 'afterNormalize' event
      await this.events.emit('afterNormalize', normalizedAst);
      
      // Ensure relationships are established and verified if needed
      if (this.options.establishRelationships && !this.options.walker?.establishRelationships) {
        const relationshipStartTime = this.options.debug ? Date.now() : 0;
        
        // Establish relationships
        establishRelationships(normalizedAst);
        
        // Verify relationships if needed
        if (this.options.verifyRelationships) {
          verifyRelationships(normalizedAst);
        }
        
        if (this.options.debug) {
          relationshipTime = Date.now() - relationshipStartTime;
        }
      }
      
      // For debugging purposes, store the timing information on the instance
      if (this.options.debug) {
        const totalTime = Date.now() - startTime;
        this._lastDebugInfo = {
          parseTime,
          walkTime,
          normalizeTime,
          relationshipTime,
          renderTime: 0,
          totalTime,
        };
      }
      
      // Return the AST
      return normalizedAst;
    } catch (error) {
      throw new ConversionError('Failed to convert HTML to AST', {
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  
  /**
   * Converts HTML to markdown
   * @param html HTML string to convert
   * @returns Conversion result with AST and markdown
   */
  public async convert(html: string): Promise<ConversionResult> {
    try {
      // Start time for debugging
      const startTime = this.options.debug ? Date.now() : 0;
      
      // Convert HTML to AST
      const ast = await this.htmlToAst(html);
      
      // Emit 'beforeRender' event
      await this.events.emit('beforeRender', ast);
      
      // Render the AST as markdown
      const renderStartTime = this.options.debug ? Date.now() : 0;
      // Merge default options with user options
      const renderOptions = { ...DEFAULT_OPTIONS, ...this.options.renderer };
      const markdown = renderMarkdown(ast, renderOptions);
      const renderTime = this.options.debug ? Date.now() - renderStartTime : 0;
      
      // Emit 'afterRender' event
      await this.events.emit('afterRender', markdown);
      
      // Create debug information
      let debug: DebugTiming | undefined;
      if (this.options.debug) {
        const totalTime = Date.now() - startTime;
        // Use previous debug info and add render time
        debug = {
          ...(this._lastDebugInfo || { 
            parseTime: 0, 
            walkTime: 0, 
            normalizeTime: 0,
            relationshipTime: 0 
          }),
          renderTime,
          totalTime,
        };
        // Clear the last debug info
        this._lastDebugInfo = undefined;
      }
      
      // Return the result
      return {
        ast,
        markdown,
        debug,
      };
    } catch (error) {
      throw new ConversionError('Failed to convert HTML to markdown', {
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}