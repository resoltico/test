# WEB2MD Project Structure

This document provides an overview of the implemented web2md project structure.

```
web2md/
├── bin/
│   └── web2md.js                       # Executable entry point
│
├── src/
│   ├── app.ts                          # Application composition
│   ├── types.ts                        # Core shared type definitions
│   │
│   ├── modules/
│   │   ├── cli/                        # CLI module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── types.ts                # Module-specific types
│   │   │   └── cli.ts                  # CLI implementation
│   │   │
│   │   ├── config/                     # Configuration module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── types.ts                # Module-specific types
│   │   │   ├── loader.ts               # Configuration loading
│   │   │   └── schema.ts               # Configuration schema
│   │   │
│   │   ├── rules/                      # Rules system module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── types.ts                # Module-specific types
│   │   │   ├── manager.ts              # Rules management
│   │   │   ├── sources/                # Rule sources
│   │   │   │   ├── index.ts            # Public sub-module API
│   │   │   │   ├── built-in.ts         # Built-in rules source
│   │   │   │   ├── config.ts           # Configuration-based rules
│   │   │   │   └── cli.ts              # CLI-override rules source
│   │   │   └── loaders/                # Rule loaders
│   │   │       ├── index.ts            # Public sub-module API
│   │   │       ├── js-loader.ts        # JavaScript rule loader
│   │   │       └── yaml-loader.ts      # YAML rule loader
│   │   │
│   │   ├── converter/                  # Converter module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── types.ts                # Module-specific types
│   │   │   ├── converter.ts            # Main converter
│   │   │   └── adapters/               # Library adapters
│   │   │       └── turndown-adapter.ts # Adapter for Turndown
│   │   │
│   │   └── io/                         # Input/Output module
│   │       ├── index.ts                # Public API
│   │       ├── types.ts                # Module-specific types
│   │       ├── reader.ts               # Content readers
│   │       ├── writer.ts               # Output writers
│   │       └── adapters/               # I/O library adapters
│   │           ├── fs-adapter.ts       # File system adapter
│   │           └── http-adapter.ts     # HTTP client adapter
│   │
│   ├── shared/                         # Shared utilities
│   │   ├── errors/                     # Error handling
│   │   │   ├── index.ts                # Error exports
│   │   │   ├── app-error.ts            # Base application error
│   │   │   └── error-types.ts          # Specific error types
│   │   ├── logger/                     # Logging
│   │   │   ├── index.ts                # Logger interface
│   │   │   ├── console-logger.ts       # Console implementation
│   │   │   └── null-logger.ts          # No-op implementation
│   │   └── utils/                      # Utility functions
│   │       ├── index.ts                # Utils exports
│   │       ├── string-utils.ts         # String manipulation
│   │       └── path-utils.ts           # Path utilities
│   │
│   └── di/                             # Dependency injection
│       ├── index.ts                    # DI container exports
│       ├── container.ts                # DI container implementation
│       └── tokens.ts                   # DI identifier tokens
│
├── rules/                              # Built-in rule definitions
│   ├── common/                         # Common HTML elements
│   │   └── elements.yaml               # Basic HTML element rules
│   ├── text/                           # Text formatting
│   │   ├── formatting.yaml             # Text formatting rules
│   │   └── links.yaml                  # Link formatting rules
│   ├── media/                          # Media handling
│   │   └── images.yaml                 # Image handling
│   ├── tables/                         # Table handling
│   │   └── tables.yaml                 # Table conversion rules
│   ├── code/                           # Code formatting
│   │   └── blocks.yaml                 # Code block formatting
│   └── math/                           # Math handling
│       └── math.js                     # Math expressions handling
│
├── tests/                              # Tests
│   └── fixtures/                       # Test fixtures
│       └── html/                       # Sample HTML files
│           └── simple.html             # Simple test case
│
├── scripts/                            # Development and build scripts
│   ├── build.js                        # Production build script
│   └── dev.js                          # Development build script
│
├── .eslintrc.js                        # ESLint configuration
├── .web2md.json                        # Sample configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Project metadata and scripts
├── project-structure.md                # This file
├── zshrc-function.txt                  # Shell function for zshrc
└── README.md                           # Project documentation
```

## Key Architecture Features

1. **Modular Design**: Each module is self-contained with a clear public API.

2. **Dependency Injection**: Services are wired together through a DI container for loose coupling.

3. **Rule System Highlights**:
   - Clear rule precedence (CLI > Config > Built-in)
   - Support for YAML and JavaScript/TypeScript rules
   - Extensible through custom rules

4. **Configuration System**:
   - Project-based configuration with `.web2md.json`
   - CLI option overrides
   - Sensible defaults

5. **Developer Experience**:
   - Fast development builds with watch mode
   - Strong TypeScript typing
   - Comprehensive error handling

## Key Implementation Details

1. **HTML to Markdown Conversion**:
   - Uses Turndown as the core engine
   - Enhanced with custom rules
   - Configurable output format

2. **Rule Implementation**:
   - Simple YAML format for basic rules
   - JavaScript for complex rules with custom logic
   - Organized by content type for maintainability

3. **I/O Handling**:
   - Support for both local files and remote URLs
   - Flexible output options (file or stdout)
   - Error handling and reporting

4. **CLI Interface**:
   - Command-line options for all features
   - Helpful error messages
   - Support for debugging
