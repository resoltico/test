# WEB2MD Project Structure

This document outlines the current project structure for WEB2MD, designed to support a secure, predictable YAML-based rules system with enhanced HTTP options for user agent customization and content compression handling. The structure emphasizes maintainability, modularity, clear separation of concerns, and security-focused rule loading.

## Directory Structure

```
web2md/
├── bin/
│   └── web2md.js                       # Executable entry point
│
├── src/
│   ├── app.ts                          # Application composition
│   ├── types/                          # Centralized type system
│   │   ├── index.ts                    # Exports all shared types
│   │   ├── core/                       # Core application types
│   │   │   ├── index.ts                # Exports all core types
│   │   │   ├── rule.ts                 # Rule-related core types
│   │   │   ├── config.ts               # Configuration-related core types
│   │   │   ├── deobfuscation.ts        # Deobfuscation-related core types
│   │   │   ├── http.ts                 # HTTP-related core types
│   │   │   └── io.ts                   # Input/Output-related core types
│   │   ├── modules/                    # Module-specific types
│   │   │   ├── index.ts                # Exports all module types
│   │   │   ├── decoder.ts              # Content decoder module types
│   │   │   └── ...                     # Other module types
│   │   └── vendor/                     # Third-party library type augmentations
│   │       ├── index.ts                # Exports all vendor type augmentations
│   │       ├── turndown.d.ts           # Turndown type declarations
│   │       ├── mathjax-node.d.ts       # MathJax type declarations
│   │       └── zstd-napi.d.ts          # Zstd type declarations
│   │
│   ├── modules/
│   │   ├── cli/                        # CLI module
│   │   │   ├── index.ts                # Public API
│   │   │   └── command.ts              # CLI implementation
│   │   │
│   │   ├── config/                     # Configuration module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── loader.ts               # YAML configuration loader
│   │   │   └── schema.ts               # Configuration schema
│   │   │
│   │   ├── deobfuscator/               # Deobfuscation module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── deobfuscator.ts         # Main deobfuscation orchestrator
│   │   │   ├── patterns.ts             # Pattern detection for obfuscation
│   │   │   ├── decoder.ts              # Decoder interface
│   │   │   └── decoders/               # Specialized decoders
│   │   │       ├── index.ts            # Exports all decoders
│   │   │       ├── cloudflare.ts       # Cloudflare email protection decoder
│   │   │       ├── base64.ts           # Base64 decoder
│   │   │       └── rot13.ts            # ROT13 decoder
│   │   │
│   │   ├── http/                       # HTTP module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── client.ts               # HTTP client with options
│   │   │   └── defaults.ts             # Default HTTP options
│   │   │
│   │   ├── decoder/                    # Content decoder module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── content-decoder.ts      # Content decoding manager
│   │   │   ├── compression.ts          # Compression format handling
│   │   │   └── charset.ts              # Character encoding handling
│   │   │
│   │   ├── rules/                      # Rules system module
│   │   │   ├── index.ts                # Public API
│   │   │   ├── manager.ts              # Rules management
│   │   │   ├── registry.ts             # Rules registry
│   │   │   ├── validator.ts            # Rule validation
│   │   │   ├── manifest-loader.ts      # Manifest loader
│   │   │   └── loaders/                # Rule loaders
│   │   │       ├── index.ts            # Loaders API
│   │   │       ├── yaml-loader.ts      # YAML rule loader
│   │   │       └── js-loader.ts        # JavaScript rule loader
│   │   │
│   │   ├── converter/                  # Conversion module
│   │   │   ├── index.ts                # Public API
│   │   │   └── converter.ts            # HTML to Markdown converter
│   │   │
│   │   ├── math/                       # Math processing module
│   │   │   ├── index.ts                # Public API
│   │   │   └── processor.ts            # Math expression processor
│   │   │
│   │   └── io/                         # Input/Output module
│   │       ├── index.ts                # Public API
│   │       ├── reader.ts               # Content readers (file/URL)
│   │       └── writer.ts               # Output writers
│   │
│   └── shared/                         # Shared utilities
│       ├── logger/                     # Logging
│       │   ├── index.ts                # Logger API
│       │   └── console.ts              # Console logger
│       └── utils/                      # Utility functions (if needed)
│
├── rules/                              # Built-in rules (flat structure)
│   ├── common-elements.yaml            # Common HTML elements
│   ├── text-formatting.yaml            # Text formatting rules
│   ├── text-links.yaml                 # Link formatting rules
│   ├── media-images.yaml               # Media handling: images
│   ├── tables.yaml                     # Table handling
│   ├── code-blocks.yaml                # Code formatting: blocks
│   ├── deobfuscation.yaml              # Deobfuscation rules
│   └── math.js                         # Math expressions handling
│
├── tests/                              # Tests
│   ├── unit/                           # Unit tests
│   │   ├── modules/                    # Tests for modules
│   │   │   ├── decoder/                # Decoder tests
│   │   │   ├── math/                   # Math processor tests
│   │   │   └── ...                     # Other module tests
│   │   └── shared/                     # Tests for shared utilities
│   │
│   ├── integration/                    # Integration tests
│   │   ├── rule-loading.test.ts        # Rule loading tests
│   │   ├── deobfuscation.test.ts       # Deobfuscation tests
│   │   ├── http-options.test.ts        # HTTP options tests
│   │   └── ...                         # Other integration tests
│   │
│   └── fixtures/                       # Test fixtures
│       ├── html/                       # Sample HTML files
│       ├── config/                     # Sample configurations
│       ├── rules/                      # Sample rules
│       └── expected/                   # Expected output
│
├── scripts/                            # Build and utility scripts
│   └── build.js                        # Build script for production
│
├── .eslintrc.js                        # ESLint configuration
├── .gitignore                          # Git ignore file
├── .node-version                       # Node.js version (for fnm)
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Package metadata
└── README.md                           # Project readme
```

## Key Architectural Features

### 1. Centralized Type System

The project features a dedicated types directory that serves as the single source of truth for all type definitions:

```
src/
├── types/                        # Centralized type system
│   ├── index.ts                  # Exports all shared types
│   ├── core/                     # Core application types
│   │   ├── index.ts              # Exports all core types
│   │   ├── rule.ts               # Rule-related core types
│   │   ├── config.ts             # Configuration-related core types
│   │   ├── deobfuscation.ts      # Deobfuscation-related core types
│   │   ├── http.ts               # HTTP-related core types
│   │   └── io.ts                 # Input/Output-related core types
│   ├── modules/                  # Module-specific types
│   │   ├── index.ts              # Exports all module types
│   │   ├── decoder.ts            # Content decoder module types
│   │   └── ...                   # Other module types
│   └── vendor/                   # Third-party library type augmentations
│       ├── index.ts              # Exports all vendor type augmentations
│       ├── turndown.d.ts         # Turndown type declarations
│       └── ...                   # Other vendor type declarations
```

This structure provides:

1. **Centralized Type Management**: All types are in a single location
2. **Clear Categorization**: Types are organized by their purpose
3. **Enhanced Discoverability**: Directory structure makes it clear where to find types
4. **Simplified Imports**: Index files provide consolidated exports
5. **Better Third-Party Integration**: Type declarations for external libraries are isolated

### 2. Modular Architecture

The system is divided into focused, cohesive modules:

```
src/
├── modules/
│   ├── cli/                        # CLI module
│   ├── config/                     # Configuration module
│   ├── deobfuscator/               # Deobfuscation module
│   ├── http/                       # HTTP module
│   ├── decoder/                    # Content decoder module
│   ├── rules/                      # Rules system module
│   ├── converter/                  # Conversion module
│   ├── math/                       # Math processing module
│   └── io/                         # Input/Output module
```

Each module:
- Has a clear, singular responsibility
- Exposes a well-defined public API through index.ts
- Encapsulates its implementation details
- Handles a specific aspect of the application

### 3. Enhanced HTTP and Content Handling

The HTTP module provides comprehensive options for web requests:

```
src/
├── modules/
│   ├── http/                       # HTTP module
│   │   ├── index.ts                # Public API
│   │   ├── client.ts               # HTTP client with options
│   │   └── defaults.ts             # Default HTTP options
│   │
│   └── decoder/                    # Content decoder module
│       ├── index.ts                # Public API
│       ├── content-decoder.ts      # Content decoding manager
│       ├── compression.ts          # Compression format handling
│       └── charset.ts              # Character encoding handling
```

Key features:
- **Custom User Agents**: Configurable user agent strings
- **Compression Support**: Handles gzip, brotli, deflate, and zstd
- **Cookie Management**: Automatic cookie handling with jar support
- **Proxy Support**: HTTP/HTTPS proxy with authentication
- **Custom Headers**: Configurable request headers
- **Charset Handling**: Automatic detection and conversion of character encodings

### 4. Secure Rule Loading

The rules system follows a strict security-focused design:

```
src/
├── modules/
│   └── rules/                      # Rules system module
│       ├── index.ts                # Public API
│       ├── manager.ts              # Rules management
│       ├── registry.ts             # Rules registry
│       ├── validator.ts            # Rule validation
│       ├── manifest-loader.ts      # Manifest loader
│       └── loaders/                # Rule loaders
│           ├── index.ts            # Loaders API
│           ├── yaml-loader.ts      # YAML rule loader
│           └── js-loader.ts        # JavaScript rule loader
```

Security principles:
- **Static Registry**: Built-in rules are defined in a fixed registry mapping
- **No Directory Scanning**: Directory scanning is completely eliminated
- **Manifest-Based Approach**: CLI directory overrides use a manifest file listing specific rules
- **Content Validation**: Rule file content structure is validated before loading
- **Path Resolution Security**: All relative paths are carefully resolved

### 5. Math Processing

The project includes a dedicated math processing module:

```
src/
├── modules/
│   └── math/                       # Math processing module
│       ├── index.ts                # Public API
│       └── processor.ts            # Math expression processor
```

Features:
- **MathML Support**: Converts MathML elements to LaTeX
- **Math Expression Detection**: Identifies various math formats in HTML
- **Customizable Delimiters**: Configurable inline and block math delimiters
- **Preprocessing**: Standardizes math elements before conversion
- **Fallback Mechanisms**: Graceful handling of errors in math processing

### 6. Deobfuscation System

The deobfuscation module handles various forms of obfuscated content:

```
src/
├── modules/
│   └── deobfuscator/               # Deobfuscation module
│       ├── index.ts                # Public API
│       ├── deobfuscator.ts         # Main deobfuscation orchestrator
│       ├── patterns.ts             # Pattern detection for obfuscation
│       ├── decoder.ts              # Decoder interface
│       └── decoders/               # Specialized decoders
│           ├── index.ts            # Exports all decoders
│           ├── cloudflare.ts       # Cloudflare email protection decoder
│           ├── base64.ts           # Base64 decoder
│           └── rot13.ts            # ROT13 decoder
```

Features:
- **Pattern Detection**: Identifies common obfuscation patterns
- **Pluggable Decoders**: Extensible decoder system
- **Email Protection**: Handles Cloudflare email protection
- **Encoding Support**: Decodes base64 and ROT13 encoded content
- **Script Cleaning**: Removes deobfuscation scripts

## Module Dependencies

The project uses a structured, modular architecture with well-defined dependencies:

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│    CLI    │────▶│   Config  │     │   HTTP    │────▶│  Decoder  │
└─────┬─────┘     └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
      │                 │                 │                 │
      │                 │                 │                 │
      │     ┌───────────▼─────┐   ┌───────▼─────┐   ┌───────▼─────┐
      ├────▶│ Deobfuscator    │   │    IO       │◀──┤ Math        │
      │     └───────────┬─────┘   └─────┬───────┘   └─────────────┘
      │                 │               │
      │                 │               │
      │    ┌────────────▼────┐    ┌────▼────────┐
      └───▶│   Rules         │    │  Converter  │
           └────────────┬────┘    └─────┬───────┘
                        │              │
                        └──────────────┘

 ┌───────────────────────────────────────────────┐
 │                Type System                     │
 └───────────────────────────────────────────────┘
```

Each module has well-defined responsibilities:

1. **CLI Module**: Command-line interface and user interaction
2. **Config Module**: Configuration loading and validation
3. **HTTP Module**: Web request handling with options
4. **Decoder Module**: Content decoding and charset handling
5. **Deobfuscator Module**: Detection and decoding of obfuscated content
6. **Rules Module**: Rule loading, validation, and management
7. **Converter Module**: HTML to Markdown conversion
8. **Math Module**: Math expression processing
9. **IO Module**: File and network input/output operations

All modules interact with the centralized type system, ensuring consistency across the application.

## Key Design Principles

### 1. HTTP-First Processing

The system follows an HTTP-first processing approach:

- **Custom User Agent**: Configurable user agent string for fetching web content
- **Content Compression Handling**: Automatic detection and decompression of compressed content
- **Character Encoding Support**: Proper handling of different character encodings
- **HTTP Options Configuration**: Flexible configuration of HTTP requests
- **Multiple Configuration Sources**: Support for CLI options and main web2md.yaml config

### 2. Content Handling

The content decoder system follows a modular design:

- **Compression Format Support**: Automatic handling of gzip, brotli, deflate, and zstd
- **Character Encoding Detection**: Smart detection of content encoding from headers and content
- **Fallback Mechanisms**: Graceful handling when encoding information is missing
- **Clean Integration**: Seamless integration with the HTTP client and deobfuscation system

### 3. Configuration Flexibility

The configuration system is designed for flexibility:

- **Main Configuration**: All web2md options in web2md.yaml, including HTTP options
- **CLI Overrides**: Command-line options that override configuration
- **Config Precedence**: Clear precedence order for configuration sources
- **Zod Schema Validation**: Strict validation of configuration values

### 4. Secure Rule Loading

The rule loading system follows these secure design principles:

- **Static registry**: Built-in rules are defined in a static registry mapping identifiers to file paths
- **No directory scanning**: Directory scanning is completely eliminated
- **Manifest-based approach**: CLI directory overrides use a manifest file listing specific rules
- **Path validation**: All paths are validated before loading
- **Content validation**: Rule file content structure is validated
- **Path resolution security**: All relative paths are carefully resolved

### 5. Module Independence

Each module remains an independent unit with clear responsibilities:

- **CLI Module**: Handles command-line interface and arguments
- **Config Module**: Manages configuration loading and validation
- **HTTP Module**: Handles web requests with custom user agent and options
- **Decoder Module**: Processes compressed and encoded content
- **Deobfuscator Module**: Detects and decodes obfuscated content
- **Rules Module**: Handles rule loading, resolution, and management via registry
- **Converter Module**: Transforms HTML to Markdown using rules
- **Math Module**: Processes mathematical expressions
- **IO Module**: Handles file and network operations

## Implementation Details

### 1. TypeScript Configuration

The TypeScript configuration is set up to leverage the modular type system:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022", "DOM"],
    "typeRoots": [
      "./node_modules/@types",
      "./src/types/vendor"
    ],
    "baseUrl": ".",
    "paths": {
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Key features:
- **ES Modules**: Uses Native ESM with NodeNext module resolution
- **DOM Library**: Includes DOM types for HTML processing
- **Strict Mode**: Enforces type safety with strict mode
- **Type Roots**: Includes vendor-specific type declarations
- **Path Aliases**: Makes type imports more concise

### 2. Build Process

The build process is handled by a dedicated script:

```javascript
// scripts/build.js
async function build() {
  // Prepare the dist directory
  prepareDistDirectory();
  
  // Run TypeScript compiler
  execute('tsc --project tsconfig.json');
  
  // Copy rules to dist - uses explicit paths from registry
  copyRulesToDist();
  
  // Make bin script executable
  makeExecutable();
}
```

Key aspects:
- **TypeScript Compilation**: Uses tsc for type checking and transpilation
- **Rules Copying**: Explicitly copies each rule file from the registry
- **Executable Marking**: Makes the bin script executable for CLI use
- **No Directory Scanning**: Only copies files explicitly listed in the registry

### 3. Shell Integration

The project includes a shell integration function:

```bash
# web2md zsh function with fnm support
web2md() {
  # Define the path to your web2md installation
  local web2md_dir="$HOME/Tools/web2md"
  local web2md_exec="$web2md_dir/bin/web2md.js"
  
  # Check if the executable exists
  if [[ ! -f "$web2md_exec" ]]; then
    echo "Error: web2md executable not found at $web2md_exec"
    return 1
  fi
  
  # Save current directory to return to it later
  local current_dir=$(pwd)
  
  # Change to the web2md directory to trigger fnm auto-switching
  cd "$web2md_dir"
  
  # Check if fnm is available and try to use the right Node version
  if command -v fnm &> /dev/null && [[ -f ".node-version" ]]; then
    eval "$(fnm env --use-on-cd)"
  fi
  
  # Execute the command with all arguments
  "$web2md_exec" "$@"
  local result=$?
  
  # Return to the original directory
  cd "$current_dir"
  
  return $result
}
```

This function:
- **Handles Node Version**: Uses fnm to ensure the correct Node.js version
- **Preserves Working Directory**: Returns to the original directory after execution
- **Provides Error Handling**: Checks for executable existence
- **Preserves Arguments**: Passes all arguments to the executable

## Future Enhancements

The current architecture provides a solid foundation for future enhancements:

1. **Additional Decoders**: The deobfuscator module could be extended with more decoders
2. **Plugin System**: A plugin system could be implemented for third-party extensions
3. **Output Format Options**: Support for additional output formats beyond Markdown
4. **Advanced Math Support**: Enhanced math processing for specialized scientific content
5. **Interactive Mode**: An interactive mode for step-by-step conversion

The modular architecture makes these enhancements straightforward to implement without affecting existing functionality.
