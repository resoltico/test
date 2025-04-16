# WEB2MD

Convert HTML webpages into semantically structured Markdown documents with advanced deobfuscation, content handling, and customizable rules.

## Features

- **HTML to Markdown Conversion**: High-fidelity conversion of HTML content to Markdown
- **YAML-Based Rules System**: Customizable conversion rules with clear organization
- **Deobfuscation**: Decode Cloudflare email protection, base64 encoding, and ROT13 obfuscation
- **HTTP Options**: Customizable user agent, headers, cookies, and proxy settings
- **Content Handling**: Automatic detection and handling of compression and character encodings
- **Smart Defaults**: Works well with minimal configuration

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/web2md.git
cd web2md

# Install dependencies
npm install

# Build the project
npm run build

# Make the CLI executable
chmod +x bin/web2md.js

# Optional: Create a symlink to run from anywhere
npm link
```

## Usage

### Basic Usage

```bash
# Convert an HTML file to Markdown
web2md -f input.html -o output.md

# Convert a web page to Markdown
web2md -u https://example.com -o example.md

# Convert a web page with a custom user agent
web2md -u https://example.com -o example.md --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

### Configuration

Create a `web2md.yaml` file in your project directory:

```yaml
# web2md.yaml
headingStyle: atx        # atx (#) or setext (===)
listMarker: "-"          # -, *, or +
codeBlockStyle: fenced   # fenced (```) or indented (4 spaces)
preserveTableAlignment: true

# HTTP options
http:
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  compression:
    enabled: true
    formats:
      - gzip
      - br
      - deflate
  requestOptions:
    timeout: 30000
    retry: 3
  cookies:
    enabled: true
    jar: true
  headers:
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"

# Tags to completely ignore during conversion
ignoreTags:
  - script
  - style
  - noscript
  - iframe

# Either use all built-ins (default if this section is omitted)
useBuiltInRules: true

# Or explicitly select which built-in rule sets to use
builtInRules:
  - common-elements
  - text-formatting
  - text-links
  - media-images
  - tables
  - code-blocks
  - math
  - deobfuscation

# Custom rules to extend or override built-ins
customRules:
  - ./my-rules/special-blocks.yaml
  - ./my-rules/math-enhanced.js

# Deobfuscation options
deobfuscation:
  enabled: true
  decoders:
    - cloudflare
    - base64
    - rot13
  emailLinks: true
  cleanScripts: true

# Debug mode for detailed logging
debug: false
```

### CLI Options

```
Usage: web2md [options]

Options:
  -f, --file <path>           HTML file to convert
  -u, --url <url>             URL to convert
  -o, --output <file>         Output file (default: stdout)
  --user-agent <string>       Custom user agent string (overrides config)
  --rules-dir <directory>     Use rules from directory manifest (overrides config)
  --deobfuscate               Force enable deobfuscation (overrides config)
  --no-deobfuscate            Disable deobfuscation (overrides config)
  --debug                     Enable debug mode with detailed logging
  -h, --help                  Display help
  -V, --version               Display version
```

## Custom Rules

You can create custom rules in YAML or JavaScript:

### YAML Rules

```yaml
# my-rules/special-blocks.yaml
rules:
  callout:
    filter: "div.callout"
    replacement: "\n\n> [!NOTE]\n> {content}\n\n"
    
  warning:
    filter: "div.warning"
    replacement: "\n\n> [!WARNING]\n> {content}\n\n"
```

### JavaScript Rules

```javascript
// my-rules/math-enhanced.js
export default {
  name: 'enhanced-math',
  
  filter: (node) => {
    // Custom logic to detect math elements
    return node.nodeName === 'math' || node.classList.contains('math');
  },
  
  replacement: (content, node) => {
    // Custom logic to format math content
    const mathContent = node.getAttribute('data-math') || content;
    return `$$${mathContent}$$`;
  }
};
```

## Shell Integration

Add this to your `.zshrc` file for easy access with automatic Node.js version switching:

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

## License

MIT
