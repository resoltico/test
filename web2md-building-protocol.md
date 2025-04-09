# WEB2MD REMARK PROTOCOL (FINAL)

## OBJECTIVE
Create a Node.js application that transforms HTML webpages into structured Markdown documents using an AST-based approach with the unified/remark ecosystem. The conversion will preserve semantic structure, formatting, links, and specialized content like mathematical expressions, while enabling customization through a flexible schema system.

## TECHNOLOGY FOUNDATION

### Core Libraries
* **Node.js 22+**: For modern JavaScript runtime capabilities
* **TypeScript 5.8.3+**: For type safety and developer experience
* **unified (^11.0.5)**: As the core processing pipeline framework
* **rehype-parse (^9.0.1)**: For parsing HTML into AST
* **rehype-remark (^10.0.1)**: For converting HTML AST to Markdown AST
* **remark-stringify (^11.0.0)**: For generating Markdown text from AST
* **remark-gfm (^4.0.1)**: For GitHub Flavored Markdown support (tables, etc.)
* **remark-math (^6.0.0)**: For mathematical expression support
* **unist-util-visit** (^5.0.0)

### CLI Experience
* **commander (^13.1.0)**: For robust command-line interface implementation
* **chalk (^5.4.1)**: For colored terminal output to improve readability
* **ora (^8.2.0)**: For elegant terminal spinners during processing

### Supporting Tools
* **mocha (^11.1.0)**: For testing as specified in the requirements
* **zod (^3.24.2)**: For schema validation with TypeScript integration
* **got (^14.4.7)**: For HTTP requests to fetch remote HTML

### Development Environment
* **pnpm**: For package management
* **fnm**: For Node.js version management
* **tsx (^4.19.3)**: For TypeScript execution
* **eslint (^9.24.0)**: For code quality

## TECHNOLOGY RATIONALE

### Core Libraries Selection

The unified/remark ecosystem provides the foundation for our AST-based processing approach. This selection offers several critical advantages:

**unified** creates a transformation pipeline architecture that separates concerns, making each step more focused and testable. This separation enables us to insert specialized processing at exactly the right stage of the pipeline.

**rehype-parse** converts HTML into an AST (Abstract Syntax Tree) representation, giving us access to the document's semantic structure rather than just its textual content. This fundamental shift from text-based to tree-based processing addresses the core shortcomings of the previous implementation.

**rehype-remark** bridges between HTML and Markdown ASTs, correctly handling the structural transformation between formats. This middleware is essential for maintaining document semantics during conversion.

**remark-stringify** serializes the Markdown AST to text with precise control over formatting options. This allows us to match the expected output formats in the reference documents.

**remark-gfm** extends the base Markdown support to include GitHub Flavored Markdown features like tables, strikethrough, and task lists. Since our reference documents include these features, this plugin is essential rather than optional.

**remark-math** addresses the mathematical content requirements, enabling proper handling of MathML elements and their conversion to Markdown-compatible notation.

### CLI Experience Design

The combination of commander, chalk, and ora creates a professional command-line experience:

**commander** provides structured command handling and argument parsing, significantly reducing the complexity of building a CLI. By handling flags, arguments, help text, and command organization, it prevents numerous edge cases and user experience issues.

**chalk** enables color-coding in terminal output, which improves information hierarchy and readability. This visual distinction helps users quickly identify different types of messages (errors, warnings, success notices).

**ora** adds progress indicators for time-consuming operations, providing essential user feedback during network requests or large file processing. Without these indicators, operations might appear to hang, leading to poor user experience.

### Schema Validation with Zod

We've selected Zod as our schema validation library because:

1. It provides TypeScript-native schema definitions that automatically generate TypeScript types
2. Its API is more intuitive and readable than alternatives
3. It offers robust error messages that help users correct schema issues
4. It supports schema composition and reuse, enabling modular schema design
5. Its focus on TypeScript integration aligns with our development approach

## ESM IMPLEMENTATION GUIDELINES

As we're using Node.js 22+ and building a modern application, we will use ECMAScript Modules (ESM) exclusively. Here are important guidelines to ensure proper ESM implementation:

### Package Configuration
```json
// package.json
{
  "type": "module",  // Critical setting for ESM
  "exports": {
    ".": "./dist/index.js"
  }
}
```

### Import/Export Best Practices

1. **Always use file extensions in imports**:
   ```typescript
   // Correct
   import { pipeline } from './core/pipeline.js';
   
   // Incorrect (will fail in ESM)
   import { pipeline } from './core/pipeline';
   ```

2. **Use ESM import syntax, not CommonJS require**:
   ```typescript
   // Correct
   import fs from 'fs/promises';
   
   // Incorrect for our ESM application
   const fs = require('fs/promises');
   ```

3. **Use proper JSON import syntax with Node.js 22+**:
   ```typescript
   // Correct for Node.js 20.10+ and 22+
   import config from './config.json' with { type: 'json' };
   
   // Incorrect for modern Node.js
   import config from './config.json' assert { type: 'json' };
   ```

4. **Handle dynamic imports correctly**:
   ```typescript
   // Dynamic import - use await with top-level await or in async function
   const module = await import('./dynamically-loaded-module.js');
   ```

### TypeScript Configuration for ESM

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",     // Critical for ESM
    "moduleResolution": "NodeNext", // Required for proper resolution
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    // Other settings...
  }
}
```

### Testing with ESM

When using Mocha with ESM:

```json
// package.json
{
  "scripts": {
    "test": "mocha --loader=tsx"
  }
}
```

```typescript
// test/example.test.ts
// Use ESM import syntax in tests
import { describe, it } from 'mocha';
import assert from 'assert';
import { yourFunction } from '../src/module.js';
```

### Path Resolution Differences

ESM has different path resolution rules than CommonJS:

1. **No __dirname or __filename globals** - Use import.meta.url instead:
   ```typescript
   import { fileURLToPath } from 'url';
   import path from 'path';

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   ```

2. **No automatic index.js resolution** - Always specify the full path:
   ```typescript
   // Correct
   import { thing } from './utils/index.js';
   // or
   import { thing } from './utils/specific-file.js';
   
   // Incorrect - won't resolve automatically in ESM
   import { thing } from './utils';
   ```

These ESM-specific guidelines will help ensure our application works correctly with modern Node.js while avoiding common pitfalls in the transition from CommonJS to ESM.

## ARCHITECTURAL APPROACH

### AST-Based Processing Pipeline

Our solution centers around a multi-stage AST-based pipeline:

```
HTML → rehype-parse → [HTML AST] → [HTML transformations] → rehype-remark → [Markdown AST] → [MD transformations] → remark-stringify → Markdown
```

This pipeline architecture enables targeted transformations at different abstraction levels:

1. **HTML Parsing Stage**: Converts textual HTML into a structured tree representation
2. **HTML AST Transformation Stage**: Applies changes to the HTML structure before conversion
3. **HTML-to-Markdown Conversion Stage**: Maps HTML concepts to their Markdown equivalents
4. **Markdown AST Transformation Stage**: Refines the Markdown structure
5. **Markdown Generation Stage**: Converts the tree back to textual Markdown

Each stage provides distinct transformation opportunities. For example, link preservation is best handled at the HTML AST stage, while formatting preferences are best applied at the Markdown generation stage.

### Incremental Enhancement Strategy

Rather than building a monolithic solution, we'll adopt an incremental enhancement approach:

1. Implement a minimal viable pipeline using existing plugins
2. Test against reference examples to identify specific gaps
3. Develop targeted solutions for identified issues
4. Integrate these solutions into the pipeline
5. Iterate with continuous testing against references

This evidence-based approach ensures we only build custom components when necessary, leveraging the ecosystem where possible.

### Schema System Architecture

The schema system will follow an AST-based design:

```
User Schema (JSON) → Zod Validation → AST Transformations → Pipeline Integration
```

The schema system consists of:

1. **Schema Definition**: A JSON format for declaring transformation rules
2. **Schema Validation**: Using Zod to ensure correctness
3. **AST Transformation Generation**: Converting rules to AST operations
4. **Pipeline Integration**: Applying transformations at appropriate stages

Unlike the previous implementation's string-based approach, the AST-based schema system operates on the document's semantic structure, providing more precise control and better handling of complex elements.

## IMPLEMENTATION FOCUS AREAS

### 1. Link Preservation System

The link preservation system must address the fundamental issue identified in previous implementations: the loss of original link attributes during conversion.

Our approach:

1. **Track Original Links**: During HTML parsing, store original link attributes in a map
2. **Preserve Reference**: Maintain a reference through the transformation pipeline
3. **Restore Original URLs**: During Markdown generation, use the preserved references
4. **Handle Special Cases**: Address email obfuscation and other edge cases

This approach preserves links exactly as they appear in the original, including special formats and encoded characters.

### 2. Mathematical Content Handling

Converting MathML to Markdown-compatible notation requires specialized handling:

1. **MathML Detection**: Identify mathematical content in the HTML AST
2. **Conversion to Notation**: Transform into GitHub-compatible math notation
3. **Format Preservation**: Maintain inline vs. block presentation
4. **Semantic Preservation**: Ensure mathematical meaning is preserved

This approach leverages remark-math for handling math content but extends it with custom preprocessing to handle MathML inputs.

### 3. Schema-Based Customization

The schema system provides runtime customization without code changes:

```json
{
  "rules": [
    {
      "selector": "table.data-table",
      "action": "transform",
      "options": {
        "headingStyle": "setext",
        "includeCaption": true
      }
    },
    {
      "selector": "div.code-example",
      "action": "codeBlock",
      "options": {
        "language": "javascript"
      }
    }
  ],
  "global": {
    "headingStyle": "atx",
    "bulletListMarker": "-",
    "emphasis": "*",
    "strong": "**"
  },
  "keep": [
    "span.keep-html",
    "div.preserve"
  ],
  "remove": [
    "div.ad",
    "aside.sidebar"
  ]
}
```

The schema system includes:

1. **Selectors**: CSS-like patterns for targeting AST nodes
2. **Actions**: Transformations to apply to matching nodes
3. **Options**: Configuration for transformations
4. **Global Settings**: Document-wide formatting preferences
5. **Keep/Remove Patterns**: Elements to preserve as HTML or exclude

This design provides a powerful yet accessible customization mechanism.

## PROJECT STRUCTURE

```
web2md/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── core/
│   │   └── pipeline.ts          # Core transformation pipeline
│   ├── plugins/                 # Custom plugins as needed
│   │   ├── rehype/              # HTML AST plugins
│   │   └── remark/              # Markdown AST plugins
│   ├── schema/
│   │   ├── index.ts             # Schema handling
│   │   ├── validation.ts        # Zod schema validation
│   │   ├── processor.ts         # Schema application
│   │   └── default.json         # Default schema
│   ├── cli/
│   │   └── index.ts             # CLI implementation
│   ├── fetchers/
│   │   ├── url.ts               # URL content fetching
│   │   └── file.ts              # File content reading
│   └── utils/                   # Utility functions
│       ├── paths.ts             # Path handling utilities
│       └── errors.ts            # Error handling utilities
└── test/
    ├── core.test.ts             # Core pipeline tests
    ├── plugins.test.ts          # Plugin tests
    ├── schema.test.ts           # Schema tests
    └── fixtures/                # Test fixtures
        ├── input.html           # Test input HTML
        └── expected.md          # Expected Markdown output
```

This structure organizes the codebase by responsibility, separating core pipeline logic from plugins, schema handling, and utilities. This modular approach improves maintainability and testability.

## TESTING STRATEGY

Using Mocha as specified in the requirements, we'll implement a comprehensive testing approach:

### Unit Testing

Test individual components in isolation:

```typescript
import { describe, it } from 'mocha';
import assert from 'assert';
import { convertLinks } from '../src/plugins/rehype/link-processor.js';

describe('Link processor plugin', function() {
  it('preserves original href attributes', function() {
    const node = { type: 'element', tagName: 'a', properties: { href: 'https://example.com?q=test&p=1' } };
    const processed = convertLinks(node);
    assert.strictEqual(processed.properties.originalHref, 'https://example.com?q=test&p=1');
  });
  
  // Additional tests...
});
```

### Integration Testing

Verify components work together correctly:

```typescript
import { describe, it } from 'mocha';
import assert from 'assert';
import { convert } from '../src/core/pipeline.js';

describe('HTML to Markdown pipeline', function() {
  it('converts HTML with links to Markdown preserving URLs', async function() {
    const html = '<a href="https://example.com?q=test&p=1">Link</a>';
    const markdown = await convert(html);
    assert.strictEqual(markdown.trim(), '[Link](https://example.com?q=test&p=1)');
  });
  
  // Additional tests...
});
```

### Reference Testing

Compare output against expected examples:

```typescript
import { describe, it } from 'mocha';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from '../src/core/pipeline.js';

// Get proper __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Reference examples', function() {
  it('converts complex HTML according to expectations', async function() {
    const html = await fs.readFile(path.join(__dirname, 'fixtures/input.html'), 'utf8');
    const expected = await fs.readFile(path.join(__dirname, 'fixtures/expected.md'), 'utf8');
    
    const result = await convert(html);
    
    // Compare, allowing for whitespace differences
    const normalizedResult = normalizeWhitespace(result);
    const normalizedExpected = normalizeWhitespace(expected);
    
    assert.strictEqual(normalizedResult, normalizedExpected);
  });
});
```

This multi-level testing approach ensures the system works correctly both in isolation and as a whole.

## EVALUATION CRITERIA

The implementation will be evaluated against these criteria:

1. **Conversion Accuracy**: Does the output match the expected Markdown format?
2. **Link Preservation**: Are links preserved exactly as in the original?
3. **MathML Handling**: Is mathematical content properly converted?
4. **HTML5 Support**: Are all HTML5 elements in the examples supported?
5. **Schema Functionality**: Does the schema system allow effective customization?
6. **CLI Experience**: Is the command-line interface professional and user-friendly?
7. **Test Coverage**: Does the test suite verify all critical functionality?
8. **Code Quality**: Is the codebase well-structured, documented, and maintainable?
9. **ESM Compliance**: Does the code properly implement ECMAScript Modules?

## CONCLUSION

This protocol provides a comprehensive plan for rebuilding web2md using an AST-based approach with the unified/remark ecosystem. By focusing on the document's semantic structure rather than its textual representation, we can achieve higher fidelity conversions while enabling powerful customization through the schema system.

The incremental enhancement strategy ensures we build only what we need based on evidence from testing. The technology choices—particularly the unified/remark ecosystem, proper ESM implementation, and Zod for validation—align perfectly with our requirements for a robust, typesafe, and extensible solution.

By addressing the key challenges of link preservation and mathematical content handling, while providing a flexible schema system, this implementation will significantly improve upon the previous approach, delivering a more accurate and customizable HTML-to-Markdown conversion tool.

Ensure URL input and file input both have own argument switches (for example “-u” for URL and “-f” for file).

Ensure path sanitization.

Develop function for .zshrc for conveniently executing web2md (with arguments) on macOS.

Output full code for all files and in the form of artifacts. Clearly state file names and their location in the project tree. Always output concrete working code (no examples, no prototypes, no concepts). If some files in the project become obsolete, give the names of such files.

You can propose, by asking me first, whether I want it or not, to add additional modules or replace existing modules in the project.
