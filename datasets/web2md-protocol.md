# WEB2JSON PROTOCOL

## OBJECTIVE
Create a webframework-agnostic Node.js application, named web2md, that transforms any HTML webpage into a structured markdown-formatted documents that preserve semantic structure, element relationships, and formatting, matching the nested structure in a source HTML.

## REQUIREMENTS
### Use Node.js 22+ features extensively
- Require Node.js 22+ — build the project around Node.js 22+ as a requirement and a foundational basis and featureset and behavior and strategies.
- Use pnpm and fnm.

### Whenever certain functionality is needed, use the technologies, functions, solutions and possibilities of these modules (btw, not implying that you have to use all these module)
- turndown (7.2.0+)
- commander (13.1.0+)
- ora (8.2.0+)
- Chalk (5.4.1+)
- got (14.4.7+)
- Jsdom (26.0.0+)
- Zod (3.24.2+)
- TypeScript (5.8.3+)
- tsx (4.19.3+)
- ESLint (9.24.0+)
- ajv (8.17.1+)
- mocha (11.1.0+)

### ENSURE and DOUBLE-CHECK

- Analyze turndown docs in file "Turndown-README.md"
- Support for processing both URLs and local files — both url input and file input need to have own arguments (-u and -f).
- Smart output path determination, sanitizing of paths and filenames (spaces, special characters, invalids, etc).
- Progress indicators and error handling with specific error types and codes.
- I want to use my own schema/conventions for converting html to md; see "dataset-comprehensive-html5-demo.html" and "dataset-comprehensive-html5-demo.md”; I want schema/conventions on how "dataset-comprehensive-html5-demo.md" that mirrors the source from which it was created "dataset-comprehensive-html5-demo.html”; the default md output of web2md should remain the core / the same how turndown works without modifications; you need to have my custom schema based on "dataset-comprehensive-html5-demo.html" and "dataset-comprehensive-html5-demo.md” and to place it in an external json file.
- Schema Management: Analyze schema metrics and structure; Compare different schemas to see differences; Validate schemas and get improvement suggestions
- The project is organized into focused modules with clear responsibilities; each component can be modified or replaced independently; the code is cleanly separated into CLI, converters, fetchers, and utilities; each component can be tested in isolation; testing for all components.
- Node is installed via fnm on macOS; the project is located at ~/Tools/web2md; we have ~/Tools/web2md/.node-version for auto node version switching. We need a function for zshrc to conveniently run web2md — this function needs to allow fnm to auto-switch Node version.
- Output full code for all files as artifacts. Clearly state file names and their location in the project tree. Always output concrete working code (no examples, no prototypes, no concepts).
- Build script in package.json
- Implement a comprehensive TypeScript application development protocol that enforces strict configuration settings ("module": "NodeNext", "moduleResolution": "NodeNext", "resolveJsonModule": true", "allowSyntheticDefaultImports": true"), validates third-party dependency type compatibility through preliminary integration tests with special attention to ESM/CommonJS boundary issues, uses contemporary JSON import syntax (import pkg from './file.json' with { type: 'json' }), applies explicit type annotations to all callback parameters, creates comprehensive interface definitions that accurately mirror external library constraints, handles schema validation libraries like Ajv by implementing strategic bypasses of TypeScript's static type checking (using techniques like // @ts-ignore comments, alternative validation strategies, or explicit as any type assertions when TypeScript erroneously rejects both constructor and function call patterns despite their runtime validity), implements fallback validation mechanisms that don't depend on problematic dependencies, validates builds incrementally with progressively stricter compiler flags, and maintains controlled escape hatches through selective type assertions only when necessary for libraries with fundamentally incompatible type definitions.
- 