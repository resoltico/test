# WEB2MD Project Structure

This document outlines the recommended project structure for WEB2MD reimagined as a CommonMark-based HTML-to-Markdown converter. The design emphasizes modularity, clear separation of concerns, and compliance with the CommonMark specification without reliance on third-party conversion libraries.

## Directory Structure

```
web2md/
├── bin/
│   └── web2md.js                       # Executable entry point
│
├── src/
│   ├── app.ts                          # Application composition
│   │
│   ├── core/                           # Core conversion pipeline
│   │   ├── parser/                     # HTML parsing
│   │   │   ├── index.ts                # Parser exports
│   │   │   └── html-parser.ts          # HTML to DOM parser
│   │   │
│   │   ├── ast/                        # AST management
│   │   │   ├── index.ts                # AST exports
│   │   │   ├── types.ts                # AST node types
│   │   │   ├── builder.ts              # AST construction
│   │   │   └── optimizer.ts            # AST optimization
│   │   │
│   │   ├── processor/                  # Node processing
│   │   │   ├── index.ts                # Processor exports
│   │   │   ├── node-processor.ts       # DOM to AST processor
│   │   │   └── context.ts              # Processing context
│   │   │
│   │   ├── renderer/                   # Markdown rendering
│   │   │   ├── index.ts                # Renderer exports
│   │   │   ├── markdown-renderer.ts    # AST to Markdown renderer
│   │   │   └── commonmark-rules.ts     # CommonMark rendering rules
│   │   │
│   │   └── index.ts                    # Core exports
│   │
│   ├── rules/                          # Rule system
│   │   ├── types.ts                    # Rule type definitions
│   │   ├── registry.ts                 # Rule registry
│   │   ├── loader.ts                   # Rule loading
│   │   ├── validator.ts                # Rule validation
│   │   ├── block-processor.ts          # Block-level rule processing
│   │   ├── inline-processor.ts         # Inline-level rule processing
│   │   └── index.ts                    # Rules exports
│   │
│   ├── services/                       # Supporting services
│   │   ├── http/                       # HTTP client
│   │   │   ├── index.ts                # HTTP exports
│   │   │   ├── client.ts               # HTTP client
│   │   │   ├── compression.ts          # Compression handling
│   │   │   └── charset.ts              # Charset handling
│   │   │
│   │   ├── deobfuscator/               # Deobfuscation
│   │   │   ├── index.ts                # Deobfuscator exports
│   │   │   ├── detector.ts             # Obfuscation detection
│   │   │   ├── deobfuscator.ts         # Deobfuscation engine
│   │   │   └── decoders/               # Specific decoders
│   │   │       ├── index.ts            # Decoders exports
│   │   │       ├── cloudflare.ts       # Cloudflare email protection
│   │   │       ├── base64.ts           # Base64 decoding
│   │   │       └── rot13.ts            # ROT13 decoding
│   │   │
│   │   ├── math/                       # Math processing
│   │   │   ├── index.ts                # Math exports
│   │   │   ├── detector.ts             # Math content detection
│   │   │   ├── processor.ts            # Math processing engine
│   │   │   └── converters/             # Format converters
│   │   │       ├── index.ts            # Converters exports
│   │   │       ├── mathml.ts           # MathML to LaTeX
│   │   │       └── asciimath.ts        # AsciiMath to LaTeX
│   │   │
│   │   └── index.ts                    # Services exports
│   │
│   ├── config/                         # Configuration
│   │   ├── index.ts                    # Config exports
│   │   ├── types.ts                    # Config type definitions
│   │   ├── loader.ts                   # Config loading
│   │   ├── validator.ts                # Config validation
│   │   └── defaults.ts                 # Default settings
│   │
│   ├── cli/                            # CLI interface
│   │   ├── index.ts                    # CLI exports
│   │   ├── command.ts                  # CLI command definitions
│   │   └── options.ts                  # CLI option parsing
│   │
│   ├── utils/                          # Shared utilities
│   │   ├── index.ts                    # Utils exports
│   │   ├── logger.ts                   # Logging
│   │   ├── dom.ts                      # DOM helpers
│   │   └── string.ts                   # String manipulation
│   │
│   └── index.ts                        # Root exports
│
├── rules/                              # Built-in rules
│   ├── blocks/                         # Block-level rules
│   │   ├── headings.yaml               # Heading rules
│   │   ├── paragraphs.yaml             # Paragraph rules
│   │   ├── lists.yaml                  # List rules
│   │   ├── blockquotes.yaml            # Blockquote rules
│   │   ├── code-blocks.yaml            # Code block rules
│   │   └── thematic-breaks.yaml        # Horizontal rule rules
│   │
│   ├── inlines/                        # Inline-level rules
│   │   ├── text-formatting.yaml        # Text styling rules
│   │   ├── links.yaml                  # Link rules
│   │   ├── images.yaml                 # Image rules
│   │   ├── code-spans.yaml             # Inline code rules
│   │   └── line-breaks.yaml            # Line break rules
│   │
│   ├── tables.yaml                     # Table rules
│   ├── math.js                         # Math rules
│   └── deobfuscation.yaml              # Deobfuscation rules
│
├── tests/                              # Tests
│   ├── unit/                           # Unit tests
│   │   ├── core/                       # Core tests
│   │   ├── rules/                      # Rules tests
│   │   └── services/                   # Services tests
│   │
│   ├── integration/                    # Integration tests
│   │
│   ├── commonmark/                     # CommonMark spec tests
│   │
│   └── fixtures/                       # Test fixtures
│       ├── html/                       # Sample HTML
│       ├── markdown/                   # Expected Markdown
│       └── rules/                      # Test rules
│
├── scripts/                            # Build scripts
│
├── .eslintrc.js                        # ESLint config
├── .gitignore                          # Git ignore
├── .node-version                       # Node.js version
├── tsconfig.json                       # TypeScript config
├── package.json                        # Package metadata
└── README.md                           # Project readme
```

## Core Components

### 1. HTML to DOM Parser

The parser module provides a clean abstraction around JSDOM to convert HTML content into a DOM tree:

```typescript
// src/core/parser/html-parser.ts
export class HtmlParser {
  parse(html: string, options?: ParserOptions): Document {
    // Parse HTML to DOM using JSDOM
    const dom = new JSDOM(html, {
      contentType: 'text/html',
      ...options
    });
    
    return dom.window.document;
  }
  
  // Additional utility methods for document manipulation
}
```

### 2. AST System

The AST module defines the structure of the Markdown Abstract Syntax Tree and provides tools for building and optimizing it:

#### Node Types

```typescript
// src/core/ast/types.ts
export type NodeType = 
  // Block types
  | 'document'
  | 'paragraph'
  | 'heading'
  | 'blockquote'
  | 'list'
  | 'list_item'
  | 'code_block'
  | 'html_block'
  | 'thematic_break'
  // Inline types
  | 'text'
  | 'softbreak'
  | 'hardbreak'
  | 'emphasis'
  | 'strong'
  | 'code'
  | 'link'
  | 'image'
  | 'html_inline'
  // Extended types
  | 'table'
  | 'math'
  | 'strikethrough'
  | 'highlight';

export interface Node {
  type: NodeType;
  children?: Node[];
  [key: string]: any; // Additional properties specific to node types
}

// Type definitions for specific node types
export interface Document extends Node { type: 'document'; children: Node[] }
export interface Heading extends Node { type: 'heading'; level: number; children: Node[] }
// ... other node type definitions
```

#### AST Builder

```typescript
// src/core/ast/builder.ts
export class AstBuilder {
  createDocument(): Document {
    return { type: 'document', children: [] };
  }
  
  createHeading(level: number, children: Node[] = []): Heading {
    return { type: 'heading', level, children };
  }
  
  // Methods for creating other types of nodes
  
  appendChild(parent: Node, child: Node): void {
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(child);
  }
  
  // Other tree manipulation methods
}
```

#### AST Optimizer

```typescript
// src/core/ast/optimizer.ts
export class AstOptimizer {
  optimize(ast: Document): Document {
    // Apply various optimizations
    this.mergeAdjacentTextNodes(ast);
    this.removeEmptyNodes(ast);
    this.normalizeWhitespace(ast);
    // More optimizations...
    
    return ast;
  }
  
  private mergeAdjacentTextNodes(node: Node): void {
    // Implementation
  }
  
  private removeEmptyNodes(node: Node): void {
    // Implementation
  }
  
  private normalizeWhitespace(node: Node): void {
    // Implementation
  }
  
  // Other optimization methods
}
```

### 3. Node Processor

The processor module converts DOM nodes to AST nodes by applying rules:

```typescript
// src/core/processor/node-processor.ts
export class NodeProcessor {
  constructor(
    private ruleRegistry: RuleRegistry,
    private astBuilder: AstBuilder
  ) {}
  
  process(document: Document): ast.Document {
    // Create root AST node
    const root = this.astBuilder.createDocument();
    
    // Create processing context
    const context = new ProcessingContext(this.ruleRegistry, this.astBuilder);
    
    // Process the document body
    this.processNode(document.body, root, context);
    
    return root;
  }
  
  private processNode(node: DOMNode, parent: ast.Node, context: ProcessingContext): void {
    // Find matching rules for this node
    const rules = context.findMatchingRules(node);
    
    if (rules.length > 0) {
      // Apply the highest-priority rule
      const rule = rules[0];
      const astNode = rule.transform(node, context);
      
      if (astNode) {
        this.astBuilder.appendChild(parent, astNode);
      }
    } else {
      // Default handling for unmatched nodes
      this.processDefaultNode(node, parent, context);
    }
    
    // Process child nodes (if not handled by the rule)
    this.processChildNodes(node, parent, context);
  }
  
  private processChildNodes(node: DOMNode, parent: ast.Node, context: ProcessingContext): void {
    // Process each child node
  }
  
  private processDefaultNode(node: DOMNode, parent: ast.Node, context: ProcessingContext): void {
    // Default handling for nodes without matching rules
  }
}
```

### 4. Markdown Renderer

The renderer module converts the AST back to Markdown text:

```typescript
// src/core/renderer/markdown-renderer.ts
export interface RenderOptions {
  headingStyle: 'atx' | 'setext';
  bulletListMarker: '-' | '*' | '+';
  codeBlockStyle: 'indented' | 'fenced';
  // Other options...
}

export class MarkdownRenderer {
  constructor(private options: RenderOptions) {}
  
  render(ast: ast.Document): string {
    return this.renderNode(ast);
  }
  
  private renderNode(node: ast.Node): string {
    switch (node.type) {
      case 'document':
        return this.renderChildren(node);
        
      case 'heading':
        return this.renderHeading(node as ast.Heading);
        
      // Cases for other node types
        
      default:
        return '';
    }
  }
  
  private renderHeading(node: ast.Heading): string {
    const content = this.renderChildren(node);
    
    if (this.options.headingStyle === 'atx') {
      // ATX style (# Heading)
      return '#'.repeat(node.level) + ' ' + content + '\n\n';
    } else {
      // Setext style (Heading\n=====)
      const underline = node.level === 1 ? '=======' : '-------';
      return content + '\n' + underline + '\n\n';
    }
  }
  
  private renderChildren(node: ast.Node): string {
    if (!node.children) return '';
    return node.children.map(child => this.renderNode(child)).join('');
  }
  
  // Methods for rendering other node types
}
```

## Rule System

The rule system defines how HTML elements are transformed into Markdown AST nodes:

### Rule Types

```typescript
// src/rules/types.ts
export interface Rule {
  name: string;
  priority: number;
  match: (node: DOMNode) => boolean;
  transform: (node: DOMNode, context: ProcessingContext) => ast.Node | null;
}

export interface YamlRule {
  match: string;
  transform: string;
  options?: Record<string, any>;
  priority?: number;
}

export interface JsRule {
  name: string;
  priority?: number;
  match: (node: DOMNode) => boolean;
  transform: (node: DOMNode, context: ProcessingContext) => ast.Node | null;
}
```

### Rule Registry

```typescript
// src/rules/registry.ts
export class RuleRegistry {
  private rules: Rule[] = [];
  
  registerRule(rule: Rule): void {
    this.rules.push(rule);
    // Sort rules by priority
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  getMatchingRules(node: DOMNode): Rule[] {
    return this.rules.filter(rule => rule.match(node));
  }
  
  // Other methods for rule management
}
```

### Rule Loader

```typescript
// src/rules/loader.ts
export class RuleLoader {
  constructor(
    private registry: RuleRegistry,
    private validator: RuleValidator
  ) {}
  
  async loadRules(config: Config): Promise<void> {
    // Load built-in rules
    await this.loadBuiltInRules(config);
    
    // Load custom rules
    if (config.customRules) {
      await this.loadCustomRules(config.customRules);
    }
  }
  
  private async loadBuiltInRules(config: Config): Promise<void> {
    // Implementation
  }
  
  private async loadCustomRules(rulePaths: string[]): Promise<void> {
    // Implementation
  }
  
  private async loadYamlRule(path: string): Promise<Rule[]> {
    // Implementation
  }
  
  private async loadJsRule(path: string): Promise<Rule[]> {
    // Implementation
  }
}
```

## Supporting Services

### HTTP Client

```typescript
// src/services/http/client.ts
export class HttpClient {
  constructor(private options: HttpOptions) {}
  
  async fetch(url: string): Promise<HttpResponse> {
    // Implementation using 'got' with compression, proxy support, etc.
  }
}
```

### Deobfuscator

```typescript
// src/services/deobfuscator/deobfuscator.ts
export class Deobfuscator {
  constructor(private decoders: DecoderRegistry) {}
  
  async process(html: string): Promise<string> {
    // Detect and decode obfuscated content
  }
}
```

### Math Processor

```typescript
// src/services/math/processor.ts
export class MathProcessor {
  constructor(private options: MathOptions) {}
  
  async process(html: string): Promise<MathProcessingResult> {
    // Extract and process math content
  }
  
  async convertMathML(mathml: string, isDisplay: boolean): Promise<string> {
    // Convert MathML to LaTeX
  }
  
  // Other math processing methods
}
```

## Configuration Management

```typescript
// src/config/loader.ts
export class ConfigLoader {
  async loadConfig(path?: string): Promise<Config> {
    // Load and validate configuration from YAML file
  }
}

// src/config/defaults.ts
export const DEFAULT_CONFIG: Config = {
  // Default settings
};
```

## CLI Interface

```typescript
// src/cli/command.ts
export class Command {
  constructor(private services: Services) {}
  
  async execute(args: string[]): Promise<void> {
    // Parse command-line arguments
    const options = this.parseOptions(args);
    
    // Load configuration
    const config = await this.services.config.loadConfig(options.configPath);
    
    // Apply CLI overrides to config
    this.applyOverrides(config, options);
    
    // Perform the conversion
    await this.runConversion(config, options);
  }
  
  private parseOptions(args: string[]): CommandOptions {
    // Parse command-line arguments using commander
  }
  
  private async runConversion(config: Config, options: CommandOptions): Promise<void> {
    // Implement the conversion pipeline
    let html = await this.getInput(options);
    
    // Apply deobfuscation if enabled
    if (config.deobfuscation.enabled) {
      html = await this.services.deobfuscator.process(html);
    }
    
    // Convert HTML to Markdown
    const markdown = await this.services.converter.convert(html, config);
    
    // Output the result
    await this.writeOutput(markdown, options);
  }
  
  // Other CLI methods
}
```

## Application Composition

```typescript
// src/app.ts
export function createApp(options: AppOptions): App {
  // Create all the necessary components
  const logger = new Logger(options.debug);
  
  const astBuilder = new AstBuilder();
  const astOptimizer = new AstOptimizer();
  
  const ruleRegistry = new RuleRegistry();
  const ruleValidator = new RuleValidator(logger);
  const ruleLoader = new RuleLoader(ruleRegistry, ruleValidator);
  
  const htmlParser = new HtmlParser();
  const nodeProcessor = new NodeProcessor(ruleRegistry, astBuilder);
  const markdownRenderer = new MarkdownRenderer(options);
  
  const converter = new Converter(
    htmlParser,
    nodeProcessor,
    astOptimizer,
    markdownRenderer,
    logger
  );
  
  // Create services
  const httpClient = new HttpClient(options.http);
  const decoderRegistry = new DecoderRegistry();
  const deobfuscator = new Deobfuscator(decoderRegistry);
  const mathProcessor = new MathProcessor(options.math);
  
  // Register decoders
  decoderRegistry.register(new CloudflareDecoder());
  decoderRegistry.register(new Base64Decoder());
  decoderRegistry.register(new Rot13Decoder());
  
  // Create configuration loader
  const configLoader = new ConfigLoader(logger);
  
  // Create services container
  const services = {
    converter,
    httpClient,
    deobfuscator,
    mathProcessor,
    config: configLoader,
    rules: ruleLoader,
    logger
  };
  
  // Create CLI command
  const command = new Command(services);
  
  // Return the application interface
  return {
    run: (args: string[]) => command.execute(args)
  };
}
```

## Key Architectural Features

### 1. CommonMark Compliance

The renderer strictly follows the CommonMark specification, ensuring that all output is fully compliant. This is achieved by:

- Implementing the exact rendering rules described in the spec
- Testing against the CommonMark specification test suite
- Handling edge cases explicitly

### 2. Modular Rule System

The rule system allows for easy customization and extension:

- Clear separation between matching, transformation, and rendering
- Support for both YAML and JavaScript rules
- Priority-based rule application

### 3. AST-Based Pipeline

The AST-based pipeline offers several advantages:

- Clean separation between parsing, transformation, and rendering
- Ability to optimize the AST before rendering
- Potential for supporting multiple output formats beyond CommonMark

### 4. Comprehensive Test Suite

The project includes a comprehensive test suite:

- Unit tests for individual components
- Integration tests for end-to-end behavior
- Tests against the CommonMark specification
- Custom tests for extended functionality (tables, math, etc.)

## Extension Points

The architecture provides several extension points for future development:

1. **Additional Rules**: New rules can be added to support custom HTML elements or alternative Markdown formats

2. **Alternative Renderers**: The AST structure allows for rendering to formats other than Markdown (e.g., HTML, PDF)

3. **Additional Processors**: New processors can be added to handle specialized content types (e.g., diagrams, charts)

4. **Plugin System**: A plugin architecture could be added to allow for third-party extensions

## Implementation Guidelines

- Use TypeScript for all code to ensure type safety
- Follow ESM module format for modern compatibility
- Maintain high test coverage, especially for the core conversion pipeline
- Use explicit error handling with meaningful error messages
- Implement detailed logging throughout the pipeline
- Support both synchronous and asynchronous operations where appropriate
- Optimize for performance in the critical path
- Apply modular design to simplify testing and maintenance