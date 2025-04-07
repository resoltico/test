# Web2JSON

A powerful Node.js application that transforms HTML webpages into structured JSON format while preserving semantic structure, element relationships, and formatting.

## Features

- Converts HTML webpages (from URLs or local files) to structured JSON
- Preserves document hierarchy and semantic relationships
- Maintains HTML formatting in content fields
- Handles special HTML elements like tables, forms, figures, and quotes
- Processes HTML5 elements with proper context preservation
- Outputs hierarchical nested tree JSON

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

```bash
# Process a URL
web2json --url https://example.com

# Process a local HTML file
web2json --file path/to/local/file.html

# Specify output directory
web2json --url https://example.com --output ~/Downloads/converted

# Enable debug mode for more verbose logging
web2json --url https://example.com --debug

# Show help
web2json --help
```

## Output

The JSON output is structured hierarchically, preserving the semantic structure, relationships between elements, and HTML formatting. The output is always in a pretty, indented format for better readability.

### Key Features of the JSON Output

1. **HTML Markup Preservation**: All HTML formatting (tags, attributes) in content fields is preserved
2. **Semantic Structure**: The document's hierarchical structure is maintained
3. **Special Elements Handling**: Properly processes tables, forms, figures, and other HTML5 elements

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
│   │   ├── index.ts
│   │   ├── section.ts
│   │   ├── table.ts
│   │   ├── form.ts
│   │   ├── figure.ts
│   │   ├── quote.ts
│   │   └── special.ts
│   ├── schema/              # Zod schema definitions
│   │   ├── index.ts
│   │   ├── document.ts
│   │   ├── section.ts
│   │   ├── table.ts
│   │   └── form.ts
│   └── utils/               # Utility functions
│       ├── index.ts
│       ├── html.ts
│       ├── json.ts
│       ├── logger.ts
│       └── path.ts
└── bin/
    └── web2json.ts          # CLI entry point
```

## License

MIT
