# HTML AST Transform

A TypeScript library for transforming and storing HTML as Abstract Syntax Tree (AST) in Node.js projects. Designed specifically for Node.js v22+ with modern JavaScript features and ESM modules.

## Features

- **Parse HTML into AST** using JSDOM with source mapping
- **Transform AST** with customizable operations
- **Serialize AST back to HTML** with formatting options
- **Store and retrieve ASTs** using memory or file-based storage
- **TypeScript-safe API** with comprehensive type definitions
- **Node.js v22+ optimized** using modern JavaScript features:
  - ESM modules exclusively
  - `structuredClone()` for deep object copying
  - TextDecoder/Encoder for efficient text processing
  - Promise-based APIs
  - Performance hooks for metrics collection
  - Enhanced buffer handling
- **Well-designed component architecture** for easy extension

## Installation

```bash
npm install html-ast-transform
```

## Usage Examples

### Basic Usage

```typescript
import { HtmlAstTransform } from 'html-ast-transform';

async function example() {
  // Create a new transformer
  const transformer = new HtmlAstTransform();
  
  // Process HTML
  const html = '<div><p>Hello World</p></div>';
  const ast = await transformer.process(html, 'example-id');
  
  // Convert AST back to HTML
  const serialized = transformer.toHtml(ast, { pretty: true });
  console.log(serialized);
  
  // Retrieve stored AST
  const storedAst = await transformer.retrieve('example-id');
}
```

### HTML Sanitization

```typescript
import { 
  HtmlAstTransform, 
  SanitizeHtmlOperation,
  SecureExternalLinksOperation
} from 'html-ast-transform';

async function sanitizeHtml(userHtml) {
  const transformer = new HtmlAstTransform();
  
  // Add sanitization operations
  transformer.addTransformation(new SanitizeHtmlOperation());
  transformer.addTransformation(new SecureExternalLinksOperation(['mysite.com']));
  
  // Parse and transform
  const { ast } = await transformer.parse(userHtml);
  const { ast: cleanAst } = await transformer.transform(ast);
  
  // Return sanitized HTML
  return transformer.toHtml(cleanAst);
}
```

### Content Extraction

```typescript
import { 
  HtmlAstTransform,
  findElementsByTagName,
  findElementsByClassName,
  getTextContent
} from 'html-ast-transform';

async function extractArticle(htmlContent) {
  const transformer = new HtmlAstTransform();
  const { ast } = await transformer.parse(htmlContent);
  
  // Find article content
  const article = findElementsByTagName(ast, 'article')[0];
  if (!article) return null;
  
  // Extract metadata
  const title = getTextContent(findElementsByTagName(article, 'h1')[0] || {});
  const content = findElementsByClassName(article, 'content')[0];
  
  return {
    title,
    content: content ? transformer.toHtml(content) : null
  };
}
```

### Custom Transformations

```typescript
import { HtmlAstTransform } from 'html-ast-transform';

async function customTransform(html) {
  const transformer = new HtmlAstTransform();
  
  // Add a custom transformation
  transformer.addTransformation({
    name: 'addNofollow',
    shouldApply: (node) => 
      node.type === 'element' && 
      node.name === 'a' && 
      node.attributes.href?.startsWith('http'),
    transform: (node, _context) => ({
      ...node,
      attributes: {
        ...node.attributes,
        rel: 'nofollow'
      }
    })
  });
  
  // Process the HTML
  const { ast } = await transformer.parse(html);
  const { ast: transformedAst } = await transformer.transform(ast);
  
  return transformer.toHtml(transformedAst);
}
```

## Core Components

### Parser

Converts HTML strings into Abstract Syntax Trees:

```typescript
const { ast, meta } = await transformer.parse(html, {
  preserveWhitespace: true,
  includePositions: true,
  collectMetrics: true
});
```

### Transformer

Modifies AST by applying transformation operations:

```typescript
// Apply built-in transformations
transformer.addTransformation(new RemoveCommentsOperation());
transformer.addTransformation(new RemoveElementsOperation(['script', 'style']));

// Transform the AST
const { ast: transformedAst, meta } = await transformer.transform(ast);
```

### Serializer

Converts AST back to HTML with formatting options:

```typescript
const html = transformer.toHtml(ast, {
  pretty: true,
  indent: '  ',
  xhtml: false,
  encodeEntities: true
});
```

### Storage

Persists and retrieves ASTs:

```typescript
// Store AST
await transformer.store('unique-id', ast);

// Retrieve AST
const retrievedAst = await transformer.retrieve('unique-id');

// Check if AST exists
const exists = await transformer.exists('unique-id');

// Delete AST
await transformer.delete('unique-id');

// List all stored ASTs
const idList = await transformer.list();
```

## Transformation Operations

### Basic Operations

- `RemoveCommentsOperation`: Removes HTML comments
- `RemoveElementsOperation`: Removes specific HTML elements
- `CollapseWhitespaceOperation`: Collapses whitespace in text nodes
- `RemoveAttributesOperation`: Removes attributes from elements

### Advanced Operations

- `SanitizeHtmlOperation`: Sanitizes HTML by removing unsafe elements and attributes
- `SecureExternalLinksOperation`: Adds target="_blank" and rel="noopener noreferrer" to external links
- `AbsoluteUrlsOperation`: Converts relative URLs to absolute URLs
- `AddClassOperation`: Adds CSS classes to elements based on a predicate
- `WrapElementsOperation`: Wraps elements matching a predicate with a new parent element
- `UnwrapElementsOperation`: Replaces elements with their children
- `AddHeadingIdsOperation`: Adds IDs to heading elements based on their content

## Utilities

### AST Utilities

Helper functions for working with AST nodes:

```typescript
// Find nodes
const headings = findElementsByTagName(ast, 'h2');
const mainContent = getElementById(ast, 'main');
const navLinks = findElementsByClassName(ast, 'nav-link');

// Create nodes
const div = createElement('div', { class: 'container' });
const text = createTextNode('Hello World');
appendChild(div, text);

// Manipulate nodes
removeNode(unwantedNode);
replaceNode(oldNode, newNode);
insertBefore(newNode, referenceNode);
```

### Performance Utilities

Utilities for measuring and monitoring performance:

```typescript
// Time operations
const { result, duration } = await timeAsync(async () => {
  return await transformer.parse(largeHtml);
});
console.log(`Parsing took ${duration}ms`);

// Create a time tracker
const tracker = createTimeTracker();
tracker.start('transform');
const result = await transformer.transform(ast);
const time = tracker.end('transform');
console.log(`Transform took ${time}ms`);
```

## Example Applications

See the `/examples` directory for complete examples:

- **HTML Sanitizer**: Sanitize user-generated content
- **Content Extractor**: Extract specific content from webpages
- **Web to Markdown**: Convert HTML to Markdown format

Run all examples:

```bash
npm run examples
```

Or run a specific example:

```bash
npm run example:sanitizer
npm run example:extractor
npm run example:markdown
```

## License

MIT
