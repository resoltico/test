# web2md

Transform HTML webpages into structured Markdown documents using an AST-based approach with the unified/remark ecosystem.

## Features

- **High-fidelity conversion** from HTML to Markdown
- **Preserves links exactly** as they appear in the original, including query parameters
- **Handles mathematical content** including MathML and LaTeX
- **Schema-based customization** for fine-grained control over the conversion process
- **Command-line interface** with professional user experience
- **Flexible input options** supporting both URLs and local files

## Installation

### Requirements

- Node.js 22.0.0 or higher

### Global Installation

```bash
npm install -g web2md
```

### Local Installation

```bash
npm install web2md
```

## Usage

### Command-Line Interface

```bash
# Convert a webpage to Markdown
web2md --url https://example.com

# Convert a local HTML file to Markdown
web2md --file path/to/file.html

# Save the output to a file
web2md --url https://example.com --output example.md

# Use a custom schema
web2md --url https://example.com --schema path/to/schema.json
```

### Command-Line Options

- `-u, --url <url>`: URL of the webpage to convert
- `-f, --file <path>`: Path to the HTML file to convert
- `-o, --output <path>`: Path to the output Markdown file
- `-s, --schema <path>`: Path to the schema file
- `-h, --help`: Display help information
- `-v, --version`: Display version information

### Shell Integration

For macOS users with Zsh, you can add the provided `web2md.zsh` function to your `.zshrc` file for more convenient usage:

1. Copy the contents of `web2md.zsh` to your `.zshrc` file
2. Reload your shell: `source ~/.zshrc`
3. Use the `web2md` function as described above

## Schema Customization

You can customize the conversion process by providing a schema file in JSON format. Here's an example schema:

```json
{
  "rules": [
    {
      "selector": "div.code-example",
      "action": "codeBlock",
      "options": {
        "language": "javascript"
      }
    },
    {
      "selector": "table.data-table",
      "action": "transform",
      "options": {
        "includeCaption": true
      }
    }
  ],
  "global": {
    "headingStyle": "atx",
    "bulletListMarker": "-",
    "emphasis": "*",
    "strong": "**"
  },
  "remove": [
    "div.ad",
    "aside.sidebar"
  ],
  "keep": [
    "span.keep-html"
  ]
}
```

### Schema Structure

- **rules**: Array of rules to apply to specific elements
  - **selector**: CSS-like selector to target elements
  - **action**: Action to apply to matching elements
  - **options**: Configuration options for the action
- **global**: Global formatting preferences for Markdown output
- **remove**: Array of selectors for elements to remove
- **keep**: Array of selectors for elements to keep as HTML

## Development

### Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the project: `pnpm build`

### Scripts

- `pnpm build`: Build the project
- `pnpm dev`: Run in development mode
- `pnpm test`: Run tests
- `pnpm lint`: Lint the code

## License

MIT