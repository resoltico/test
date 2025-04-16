declare module 'turndown' {
  export interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: '```' | '~~~';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '__' | '**';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
    preformattedCode?: boolean;
  }

  export interface Rule {
    filter: string | string[] | ((node: Node, options: TurndownOptions) => boolean);
    replacement: (content: string, node: Node, options: TurndownOptions) => string;
  }

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    turndown(html: string | Node): string;
    use(plugin: (service: TurndownService) => void): TurndownService;
    addRule(key: string, rule: Rule): TurndownService;
    keep(filter: string | string[] | ((node: Node, options: TurndownOptions) => boolean)): TurndownService;
    remove(filter: string | string[] | ((node: Node, options: TurndownOptions) => boolean)): TurndownService;
    escape(text: string): string;
  }
}
