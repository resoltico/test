# WEB2MD

Convert HTML webpages into semantically structured Markdown documents with a flexible YAML-based rules system.

## Features

- Convert HTML files or web pages to clean, semantic Markdown
- Flexible YAML-based rules system for customization
- Smart defaults for common HTML elements
- Selective rule activation for fine-grained control
- Custom rules for specialized HTML structures
- Support for math expressions, tables, code blocks, and more

## Installation

### Prerequisites

- Node.js v22.14.0 or higher
- npm or pnpm for package management

### Global Installation

```bash
npm install -g web2md
```

### Local Installation

```bash
npm install web2md
```

## Usage

### Basic Usage

Convert an HTML file to Markdown:

```bash
web2md -f input.html -o output.md
```

Convert a web page to Markdown:

```bash
web2md -u https://example.com -o example.md
```

### Options

```
Usage: web2md [options]

Options:
  -f, --file <path>       HTML file to convert
  -u, --url <url>         URL to convert
  -o, --output <file>     Output file (default: stdout)
  --rules-dir <directory> Use rules from this directory (overrides config)
  --debug                 Enable debug mode with detailed logging
  -h, --help              Display help
  -V, --version           Display version
```

## Configuration

Create a `web2md.yaml` file in your project directory to customize the conversion process.

### Basic Configuration

```yaml
# web2md.yaml
headingStyle: atx        # atx (#) or setext (===)
listMarker: "-"          # -, *, or +
codeBlockStyle: fenced   # fenced (```) or indented (4 spaces)
preserveTableAlignment: true

# Tags to completely ignore during conversion
ignoreTags:
  - script
  - style
  - noscript
  - iframe

# Use all built-in rules
useBuiltInRules: true
```

### Selective Rule Activation

```yaml
# web2md.yaml
# Only use heading, formatting, and link rules
builtInRules:
  - common/elements  # For headings, paragraphs, etc.
  - text/formatting  # For bold, italic, etc.
  - text/links       # For hyperlinks
```

### Custom Rules

```yaml
# web2md.yaml
# Use all built-in rules
useBuiltInRules: true

# Add custom rules
customRules:
  - ./my-rules/note-boxes.yaml
  - ./my-rules/custom-callouts.js
```

## Custom Rules

### YAML Rules

Create custom rules using YAML:

```yaml
# ./my-rules/note-boxes.yaml
rules:
  note:
    filter: "div.note, aside.note"
    replacement: "> **Note:** {content}\n\n"
  
  warning:
    filter: "div.warning, aside.warning"
    replacement: "> **Warning:** {content}\n\n"
  
  info:
    filter: "div.info, aside.info"
    replacement: "> **Info:** {content}\n\n"
```

### JavaScript Rules

For more complex rules, use JavaScript:

```javascript
// ./my-rules/custom-callouts.js
export default {
  name: 'callout',
  
  filter: (node) => {
    return node.nodeName === 'DIV' && 
           node.classList.contains('callout');
  },
  
  replacement: (content, node) => {
    const type = node.getAttribute('data-type') || 'note';
    const title = node.getAttribute('data-title') || type.charAt(0).toUpperCase() + type.slice(1);
    
    return `> **${title}:** ${content}\n\n`;
  }
};
```

## Built-in Rule Sets

WEB2MD includes the following built-in rule sets:

- `common/elements` - Basic HTML elements (headings, paragraphs, lists)
- `text/formatting` - Text styling (bold, italic, etc.)
- `text/links` - Hyperlinks
- `media/images` - Images and figures
- `tables/tables` - Table formatting
- `code/blocks` - Code blocks with language highlighting
- `math/math` - Mathematical expressions

## Shell Setup for macOS/Linux

Add this function to your `~/.zshrc` file for easy access with automatic Node version switching:

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

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/web2md.git
cd web2md

# Install dependencies
pnpm install

# Build the project
pnpm build

# Make the CLI executable
chmod +x bin/web2md.js

# Optional: Link for global use
npm link
```

### Development Mode

```bash
pnpm dev
```

### Building

```bash
pnpm build
```

## License

Released under the MIT License.