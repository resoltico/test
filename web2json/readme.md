# Web2JSON

Transform HTML webpages into structured, hierarchical JSON format that preserves semantic structure, element relationships, and formatting.

## Requirements

- Node.js 22+ (managed with [fnm](https://github.com/Schniz/fnm))
- [pnpm](https://pnpm.io/) package manager

## Features

- Fetch webpages from URLs or process local HTML files
- Preserve HTML document structure in a nested JSON format
- Extract semantic structure with headings, sections, and special elements
- Process tables, forms, figures, SVGs, and other specialized content
- Use modern Node.js 22+ features
- Command line interface with helpful feedback

## Installation

### macOS Installation

1. Make sure you have [fnm](https://github.com/Schniz/fnm) and [pnpm](https://pnpm.io/) installed:

```bash
# Install fnm if not already installed
brew install fnm

# Install pnpm if not already installed
brew install pnpm
```

2. Clone the repository:

```bash
mkdir -p ~/Tools
git clone https://github.com/yourusername/web2json.git ~/Tools/web2json
cd ~/Tools/web2json
```

3. Install dependencies:

```bash
fnm use
pnpm install
```

4. Add the zshrc function for easier use:

Add the following function to your `~/.zshrc` file:

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

5. Restart your terminal or source your `.zshrc`:

```bash
source ~/.zshrc
```

## Usage

### Basic Usage

Process a webpage and save it as JSON:

```bash
web2json https://example.com
```

By default, the output JSON is saved in the current directory with a filename based on the URL.

### Specify Output File

```bash
web2json https://example.com output.json
```

### Process Local HTML File

```bash
web2json myfile.html
```

### Force Source Type

If the source type isn't detected correctly:

```bash
# Force URL
web2json -u example.html

# Force file
web2json -f https://example.com
```

### Get Help

```bash
web2json --help
```

## JSON Output Structure

The JSON output preserves the structure of the HTML document:

```json
{
  "title": "Page Title",
  "metadata": {
    "url": "https://example.com",
    "language": "en"
  },
  "content": [
    {
      "type": "section",
      "id": "intro",
      "title": "Introduction",
      "level": 1,
      "content": ["This is the introduction paragraph."],
      "children": [
        {
          "type": "section",
          "title": "Subsection",
          "level": 2,
          "content": ["This is a subsection."]
        }
      ]
    },
    {
      "type": "article",
      "title": "Main Content",
      "content": ["Article content goes here."],
      "table": {
        "caption": "Sample Table",
        "headers": ["Column 1", "Column 2"],
        "rows": [
          ["Row 1 Cell 1", "Row 1 Cell 2"],
          ["Row 2 Cell 1", "Row 2 Cell 2"]
        ]
      }
    }
  ]
}
```

## License

MIT
