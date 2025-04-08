# Web2JSON

A powerful Node.js 22+ application that transforms HTML webpages into structured JSON format while precisely preserving semantic structure, element relationships, and formatting.

## Features

- Converts HTML webpages (from URLs or local files) to hierarchical nested JSON
- Preserves document structure and semantic hierarchy exactly as in the source HTML
- Maintains all HTML formatting in content fields
- Accurately processes special HTML5 elements like tables, forms, figures, and quotes
- Properly handles mathematical formulas, definition lists, and code blocks
- Outputs hierarchical nested tree JSON that maintains the document's logical structure

## Requirements

- Node.js 22.0.0 or higher
- pnpm
- fnm (Fast Node Manager)

## Installation

### macOS Setup

1. Ensure you have fnm installed:
   ```bash
   brew install fnm
   ```

2. Clone the repository:
   ```bash
   mkdir -p ~/Tools
   git clone https://github.com/yourusername/web2json.git ~/Tools/web2json
   cd ~/Tools/web2json
   ```

3. Set up the correct Node.js version:
   ```bash
   fnm use
   ```

4. Install dependencies:
   ```bash
   pnpm install
   ```

5. Build the project:
   ```bash
   pnpm build
   ```

### ZSH Integration

Add the following function to your `~/.zshrc` file for easy access:

```bash
# web2json function with automatic Node version switching through fnm
function web2json() {
  # Save current directory and Node version
  local current_dir=$(pwd)
  local web2json_dir="$HOME/Tools/web2json"
  local current_node=""
  
  # Check if we have fnm and save current Node version
  if command -v fnm &> /dev/null; then
    current_node=$(node -v 2>/dev/null || echo "")
    echo "🔍 Current Node version: $current_node"
  else
    echo "⚠️  fnm not found - Node version will not be managed automatically"
  fi
  
  # Go to the web2json directory
  echo "📁 Changing to web2json directory..."
  cd "$web2json_dir" || {
    echo "❌ Error: Could not find web2json directory at $web2json_dir"
    return 1
  }
  
  # Activate the correct Node version with fnm
  if command -v fnm &> /dev/null; then
    echo "🔄 Activating required Node.js version from .node-version..."
    fnm use
    echo "✅ Using Node $(node -v)"
  fi
  
  # Run the command
  if [ "$#" -eq 0 ]; then
    # Show help if no arguments provided
    echo "ℹ️  Showing web2json help:"
    pnpm dev --help
  else
    echo "🚀 Running web2json with arguments: $@"
    pnpm dev "$@"
    
    # Check exit status
    if [ $? -eq 0 ]; then
      echo "✅ Conversion completed successfully"
    else
      echo "❌ Conversion failed"
    fi
  fi
  
  # Return to original directory
  echo "📁 Returning to original directory..."
  cd "$current_dir" || true
  
  # Restore previous Node version
  if command -v fnm &> /dev/null && [ -n "$current_node" ]; then
    echo "🔄 Restoring previous Node version..."
    # Remove the 'v' prefix if present
    fnm use "$(echo "$current_node" | sed 's/^v//')" > /dev/null 2>&1
    echo "✅ Restored to Node $(node -v)"
  fi
  
  echo "💻 Ready for next command"
}
```

After adding this function, reload your shell configuration:

```bash
source ~/.zshrc
```

## Usage

### Command Line Interface

```bash
# Process a URL
web2json --url https://example.com

# Process a local HTML file
web2json --file path/to/local/file.html

# Specify output directory
web2json --url https://example.com --output ~/Downloads/converted

# Enable debug mode for more verbose logging
web2json --url https://example.com --debug

# Process file and preserve HTML formatting
web2json --file path/to/file.html --preserve-html

# Process all HTML files in a directory recursively
web2json --file path/to/file.html --recursive

# Show help
web2json --help
```

### Programmatic API

You can also use web2json as a library in your Node.js projects:

```javascript
import { convertUrlToJson, convertFileToJson } from 'web2json';

// Convert a URL to JSON
async function processUrl() {
  const result = await convertUrlToJson('https://example.com', {
    outputPath: './output',
    debug: true
  });
  
  console.log(result.document); // Access the JSON structure
  console.log(result.json);     // Access the formatted JSON string
}

// Convert a local file to JSON
async function processFile() {
  const result = await convertFileToJson('./path/to/file.html', {
    outputPath: './output'
  });
  
  console.log(result.document); // Access the JSON structure
}
```

## Output Structure

The JSON output preserves the semantic structure of the HTML document:

```json
{
  "title": "Document Title",
  "content": [
    {
      "type": "section",
      "id": "section-id",
      "title": "Section Title",
      "level": 2,
      "content": [
        "HTML formatted content...",
        "More content..."
      ],
      "children": [
        // Nested sections
      ]
    },
    {
      "type": "article",
      "id": "article-id",
      "children": [
        // Sections within article
      ]
    },
    // Other top-level elements (quotes, search, etc.)
  ]
}
```

### Key Features of the JSON Output

1. **HTML Markup Preservation**: All HTML formatting (tags, attributes) in content fields is preserved exactly as in the source
2. **Hierarchical Structure**: The document's hierarchical structure is maintained with proper nesting of sections
3. **Special Elements Handling**: Special HTML5 elements like tables, forms, figures, and formulas are processed into structured JSON
4. **Content Fidelity**: Text content, including special characters and entities, is preserved accurately

## Testing

The project includes comprehensive tests to verify the output matches the expected structure:

```bash
# Run all tests
cd ~/Tools/web2json
pnpm tsx test/run-tests.sh

# Run validation test only
pnpm tsx test/validation-test.ts

# Run basic functionality test
pnpm tsx test/basic-test.ts
```

## Project Structure

```
web2json/
├── .node-version            # Node version requirement
├── .eslintrc.js             # ESLint configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Project dependencies and scripts
├── README.md                # Installation and usage instructions
├── src/
│   ├── index.ts             # Main entry point
│   ├── cli.ts               # Command-line interface
│   ├── fetcher.ts           # HTML fetching module
│   ├── parser.ts            # Main HTML parsing logic
│   ├── processors/          # Specialized element processors
│   │   ├── index.ts         # Central export for all processors
│   │   ├── section.ts       # Section processing
│   │   ├── table.ts         # Table processing
│   │   ├── form.ts          # Form processing
│   │   ├── figure.ts        # Figure processing
│   │   ├── quote.ts         # Quote processing
│   │   ├── formula.ts       # Formula/special content processing
│   │   └── special.ts       # Other special elements
│   ├── schema/              # Zod schema definitions
│   │   ├── index.ts         # Central export for all schemas
│   │   ├── document.ts      # Document schema
│   │   ├── section.ts       # Section schema
│   │   ├── table.ts         # Table schema
│   │   └── form.ts          # Form schema
│   └── utils/               # Utility functions
│       ├── index.ts         # Central export for all utilities
│       ├── html.ts          # HTML processing utilities
│       ├── json.ts          # JSON utilities
│       ├── logger.ts        # Logging utilities
│       └── path.ts          # Path handling utilities
└── test/
    ├── basic-test.ts        # Basic functionality test
    ├── validation-test.ts   # Validation against expected output
    └── run-tests.sh         # Test runner script
```

## Development

### Building the Project

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run linting
pnpm lint

# Run the development version
pnpm dev --url https://example.com
```

## License

MIT