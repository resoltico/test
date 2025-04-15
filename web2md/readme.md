# WEB2MD

A powerful Node.js CLI application that transforms HTML webpages into semantically structured Markdown documents using a YAML-based rules system.

## Features

- Convert HTML files and web pages to clean, well-structured Markdown
- Smart defaults for excellent results with zero configuration
- Highly customizable YAML-based rules system
- Built-in rules for common HTML elements
- Support for custom rule extensions
- Security-focused design with explicit rule loading

## Installation

### Prerequisites

- Node.js v22.14.0 or higher

### Install from NPM

```bash
npm install -g web2md
```

### Install from Source

```bash
git clone https://github.com/yourusername/web2md.git
cd web2md
npm install
npm run build
npm link
```

## Basic Usage

### Convert an HTML File

```bash
web2md -f input.html -o output.md
```

### Convert a Web Page

```bash
web2md -u https://example.com -o example.md
```

### Show Output in Terminal

```bash
web2md -f input.html
```

## Configuration

WEB2MD can be customized by creating a `web2md.yaml` file in your project directory:

```yaml
# Markdown style options
headingStyle: atx      # atx (#) or setext (===)
listMarker: "-"        # -, *, or +
codeBlockStyle: fenced # fenced (```) or indented (4 spaces)
preserveTableAlignment: true

# Tags to completely ignore during conversion
ignoreTags:
  - script
  - style
  - noscript
  - iframe

# Either use all built-ins (default if this section is omitted)
useBuiltInRules: true

# Or explicitly select which built-in rule sets to use
# builtInRules:
#   - common-elements    # Basic HTML elements (headings, paragraphs, lists)
#   - text-formatting    # Bold, italic, etc.
#   - text-links         # Hyperlinks and references
#   - media-images       # Images and figures
#   - tables             # Table formatting
#   - code-blocks        # Code blocks with language highlighting
#   - math               # Mathematical expressions

# Custom rules to extend or override built-ins
# customRules:
#   - ./my-rules/special-blocks.yaml  # Custom YAML rules
#   - ./my-rules/math-enhanced.js     # Custom JS rules

# Debug mode for detailed logging
debug: false
```

## Custom Rules

### YAML Rules

Create a YAML file with your custom rules:

```yaml
# my-rules/note-boxes.yaml
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

For more complex rules, create a JavaScript file:

```javascript
// my-rules/custom-callouts.js
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

## CLI Options

```
Usage: web2md [options]

Options:
  -f, --file <path>       HTML file to convert
  -u, --url <url>         URL to convert
  -o, --output <file>     Output file (default: stdout)
  --rules-dir <directory> Use rules from directory manifest (overrides config)
  --debug                 Enable debug mode with detailed logging
  -h, --help              Display help
  -V, --version           Display version
```

## Using with fnm on macOS/Linux

If you're using `fnm` for Node.js version management, add this function to your `.zshrc`:

```bash
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

## License

MIT
