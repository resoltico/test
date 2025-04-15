declare module 'turndown' {
  /**
   * TurndownService options
   */
  export interface Options {
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: '```' | '~~~';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '**' | '__';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
    preformattedCode?: boolean;
  }

  /**
   * Rule replacement function
   */
  export type ReplacementFunction = (
    content: string,
    node: Node,
    options: Options
  ) => string;

  /**
   * Rule filter function
   */
  export type FilterFunction = (node: Node, options: Options) => boolean;

  /**
   * Rule filter
   */
  export type Filter = string | string[] | FilterFunction;

  /**
   * Rule definition
   */
  export interface Rule {
    filter: Filter;
    replacement: ReplacementFunction;
  }

  /**
   * TurndownService class
   */
  export default class TurndownService {
    constructor(options?: Options);
    
    /**
     * Convert HTML to Markdown
     */
    turndown(html: string | Node): string;
    
    /**
     * Add a rule
     */
    addRule(key: string, rule: Rule): this;
    
    /**
     * Keep elements as HTML
     */
    keep(filter: Filter): this;
    
    /**
     * Remove elements entirely
     */
    remove(filter: Filter): this;
    
    /**
     * Use a plugin
     */
    use(plugin: (service: TurndownService) => void): this;
  }
}
