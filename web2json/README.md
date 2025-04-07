# Web2JSON

A powerful Node.js application that transforms HTML webpages into structured JSON, preserving semantic structure, element relationships, and formatting.

## Features

- **Hierarchical Structure**: Preserves document structure with nested sections based on heading levels
- **Smart Element Processing**: Special handling for tables, forms, figures, quotes, and more
- **Content Preservation**: Maintains HTML formatting within content strings
- **Robust HTML Parsing**: Handles a wide variety of web content
- **High Performance**: Fast processing with optimized JSON serialization
- **CLI Interface**: Simple command-line interface for easy automation
- **Programmable API**: Use as a library in your own Node.js applications

## Requirements

- Node.js 22+
- pnpm
- fnm (recommended for Node.js version management)

## Installation

### Using fnm (recommended)

```bash
# Install fnm if you don't have it
brew install fnm

# Clone the repository
git clone https://github.com/yourusername/web2json.git ~/Tools/web2json
cd ~/Tools/web2json

# Install dependencies using pnpm
pnpm install

# Build the application
pnpm build
```

### Shell Integration

Add the following function to your `~/.zshrc` to make web2json easily accessible from anywhere:

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

After adding the function, reload your shell or source your `.zshrc`:

```bash
source ~/.zshrc
```

## Usage

### Command Line Interface

Convert a webpage URL to JSON:

```bash
web2json https://example.com -o example.json
```

Convert a local HTML file to JSON:

```bash
web2json /path/to/file.html -o output.json
```

### Options

- `-o, --output <path>`: Specify output file path
- `-v, --verbose`: Enable verbose logging
- `-q, --quiet`: Disable all logging except errors
- `-p, --preserve-whitespace`: Preserve whitespace in HTML
- `-d, --decode-entities`: Decode HTML entities
- `-t, --timeout <ms>`: Timeout for HTTP requests in milliseconds (default: 30000)
- `-r, --retries <count>`: Number of retries for HTTP requests (default: 3)

### Examples

Convert a webpage and save to a specific location:

```bash
web2json https://example.com -o ~/Documents/example.json
```

Convert a local HTML file with verbose logging:

```bash
web2json ~/Downloads/page.html -v -o ~/Documents/page.json
```

Convert a complex webpage with preserved whitespace:

```bash
web2json https://developer.mozilla.org -p -o mdn.json
```

### Programmatic API

You can also use web2json as a library in your Node.js applications:

```javascript
import { convertUrlToJson, convertHtmlToJson } from 'web2json';

// Convert URL to JSON
const outputPath = await convertUrlToJson('https://example.com', {
  outputPath: './example.json'
});

// Convert HTML string to JSON
const html = '<html><body><h1>Hello World</h1></body></html>';
const json = await convertHtmlToJson(html, {
  preserveWhitespace: true
});
```

## JSON Output Structure

The output JSON follows a hierarchical structure:

```json
{
  "title": "Page Title",
  "content": [
    {
      "type": "section",
      "id": "section-id",
      "title": "Section Title",
      "level": 1,
      "content": [
        "Paragraph content with <strong>HTML formatting</strong> preserved."
      ],
      "children": [
        {
          "type": "section",
          "title": "Subsection Title",
          "level": 2,
          "content": ["Subsection content..."]
        }
      ]
    }
  ]
}
```

Special elements are represented as structured objects:

```json
{
  "type": "section",
  "title": "Section with Table",
  "table": {
    "caption": "Table Caption",
    "headers": ["Header 1", "Header 2"],
    "rows": [
      ["Row 1, Cell 1", "Row 1, Cell 2"],
      ["Row 2, Cell 1", "Row 2, Cell 2"]
    ]
  }
}
```

## License

MIT
