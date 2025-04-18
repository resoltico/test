# html-to-commonmark-core

A comprehensive, extensible library for converting HTML to CommonMark-compatible Markdown.

This project implements a complete transformation pipeline from HTML to Markdown with a focus on:

- **Semantic Accuracy**: Preserves the meaning and structure of the original HTML
- **Extensibility**: Easily customized through plugins and rule extensions
- **Format Agnosticism**: AST representation is independent of rendering concerns
- **Rule-driven Processing**: Clear, modular handling of HTML elements
- **Modern JavaScript**: Built for Node.js v22+ with full ESM support

## Installation

```bash
npm install html-to-commonmark-core
```

## Basic Usage

```javascript
import { convertHtmlToMarkdown } from 'html-to-commonmark-core';

const html = `
<h1>Hello World</h1>
<p>This is a <strong>test</strong> with some <em>emphasized text</em>.</p>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
`;

// Simple conversion
const result = await convertHtmlToMarkdown(html);
console.log(result.markdown);
```

## Advanced Usage

### Working with AST

```javascript
import { convertHtmlToAst, renderAstToMarkdown } from 'html-to-commonmark-core';

// Convert HTML to AST
const ast = await convertHtmlToAst(html);

// Modify the AST if needed
// ...

// Render the AST as markdown
const markdown = renderAstToMarkdown(ast, {
  headingStyle: 'atx',
  bulletMarker: '-',
  codeBlockStyle: 'fenced'
});
```

### Custom Engine Configuration

```javascript
import { HtmlToCommonMarkEngine } from 'html-to-commonmark-core';

// Create a custom engine
const engine = new HtmlToCommonMarkEngine({
  parser: {
    strict: true,
    normalize: true
  },
  normalizer: {
    mergeText: true,
    fixStructure: true
  },
  renderer: {
    headingStyle: 'atx-closed',
    bulletMarker: '*'
  }
});

// Convert HTML to markdown
const result = await engine.convert(html);
```

### Custom Rules

```javascript
import { HtmlToCommonMarkEngine, TagRule } from 'html-to-commonmark-core';
import * as builder from 'html-to-commonmark-core/ast/builder';

// Create a custom rule
const customRule: TagRule = {
  tagName: 'CUSTOM',
  emit(node, context) {
    const children = context.renderChildrenAsAst(node);
    return builder.emphasis(children);
  }
};

// Create an engine with the custom rule
const engine = new HtmlToCommonMarkEngine();
engine.rules.register(customRule);

// Convert HTML with the custom rule
const result = await engine.convert(html);
```

## Testing

The library includes a comprehensive test suite to ensure reliability. Tests are written using Vitest, a modern testing framework that's compatible with Jest's API.

### Requirements

Before running tests, ensure you have all dependencies installed:

```bash
pnpm install
```

For test coverage reports, you'll need the V8 coverage provider:

```bash
pnpm add -D @vitest/coverage-v8
```

### Running Tests

#### Basic Test Execution

Run all tests with:

```bash
pnpm test
```

This command executes all test files in the project and displays results in the terminal. You'll see output showing which tests passed or failed, along with execution time information.

#### Running Specific Tests

To run a specific test file:

```bash
pnpm test tests/basic.test.ts
```

This is useful when focusing on a particular component or feature during development.

#### Watch Mode for Development

During active development, you can use watch mode to automatically re-run tests when files change:

```bash
pnpm test:watch
```

This provides immediate feedback as you work, helping you catch issues early in the development process.

#### Code Coverage Reports

To generate a code coverage report:

```bash
pnpm test:coverage
```

This command runs all tests and produces a detailed report showing:

- Statement coverage: Percentage of code statements executed during tests
- Branch coverage: Percentage of code branches (if/else statements, etc.) executed
- Function coverage: Percentage of functions called during tests
- Line coverage: Percentage of code lines executed

The coverage report will display in the terminal and also generate an HTML report in the `coverage` directory that you can open in a browser for an interactive view.

#### Type Checking

You can run TypeScript type checking separately from the tests:

```bash
pnpm typecheck
```

This ensures that your code adheres to the type definitions without having to run the full test suite.

### Test Structure

Tests are located in the `tests` directory with `basic.test.ts` containing the core functionality tests. The test suite verifies:

- Basic HTML conversion (headings, paragraphs, formatting)
- List conversion (ordered, unordered, nested)
- Link and image handling
- Code block rendering
- Blockquote processing
- Table conversion
- AST manipulation capabilities
- Complex nested HTML structures

Each test focuses on a specific aspect of the conversion process, ensuring that the output markdown correctly represents the input HTML according to CommonMark specifications.

## Documentation

To generate API documentation:

```bash
pnpm docs
```

This creates HTML documentation in the `docs` directory based on the TypeScript types and JSDoc comments.

## Examples

To run the examples:

```bash
pnpm example
```

This executes the example code in the `examples` directory, demonstrating practical usage of the library.

## Why Use This Library?

- **Clean AST Representation**: Provides a structured, semantic representation of the document
- **Separation of Concerns**: Parsing, transformation, and rendering are distinct phases
- **Extensibility**: Add custom rules or renderers to support specific needs
- **Standards-Compliant**: Targets CommonMark spec 0.31.2
- **Modern JavaScript**: Built with current best practices and modern language features

## Related Projects

This core library can be used as a foundation for:

- Static site generators
- Markdown editors
- CMS importers
- Documentation tools
- Conversion utilities

## License

MIT
