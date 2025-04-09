# web2md

Convert HTML webpages into Markdown with customizable schemas and enhanced accuracy.

## Features

- Convert HTML from URLs or local files to Markdown
- Customize conversion with schema files
- Preserve exact links and URLs without sanitization
- Accurate MathML to LaTeX conversion for mathematical content
- Smart SVG to Markdown chart descriptions
- Smart output path determination
- Progress indicators and detailed error messages
- Schema management and comparison tools
- Output analysis to compare generated Markdown against expected results

## Requirements

- Node.js 22+ (managed with fnm)
- PNPM package manager

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/web2md.git ~/Tools/web2md
   ```

2. Install dependencies:
   ```
   cd ~/Tools/web2md
   pnpm install
   ```

3. Build the project:
   ```
   pnpm build
   ```

4. Add the convenience function to your `.zshrc` file:
   ```bash
   # Function to run web2md with automatic Node version switching
   web2md() {
     (
       # Change to the web2md directory
       cd ~/Tools/web2md || { echo "web2md directory not found"; return 1; }
       
       # Ensure fnm is available and auto-switch Node version based on .node-version
       if command -v fnm >/dev/null 2>&1; then
         eval "$(fnm env --use-on-cd)"
       else
         echo "Warning: fnm not found, Node version might not be correct"
       fi
       
       # Run web2md with provided arguments
       if [ -f "dist/index.js" ]; then
         node dist/index.js "$@"
       else
         echo "Error: web2md is not built. Run 'cd ~/Tools/web2md && pnpm build' first."
         return 1
       fi
     )
   }
   ```

5. Source your `.zshrc` file:
   ```
   source ~/.zshrc
   ```

## Usage

### Convert a webpage by URL

```
web2md convert -u https://example.com
```

### Convert a local HTML file

```
web2md convert -f path/to/file.html
```

### Specify output file

```
web2md convert -u https://example.com -o output.md
```

### Use a custom schema

```
web2md convert -u https://example.com -s path/to/schema.json
```

### Analyze output against a reference file

```
web2md analyze path/to/expected.md path/to/actual.md
```

### Full options

```
Usage: web2md [options] [command]

Convert HTML webpages to Markdown with customizable schemas

Options:
  -V, --version         output the version number
  -h, --help            display help for command

Commands:
  convert [options]     Convert HTML to Markdown
  analyze <expected> <actual>  Analyze differences between expected and actual Markdown output
  help [command]        display help for command

Convert options:
  -u, --url <url>       URL of the webpage to convert
  -f, --file <file>     Path to the local HTML file to convert
  -o, --output <path>   Output file path
  -s, --schema <path>   Path to custom conversion schema JSON file
```

## Schema Management

You can create custom conversion schemas to control how HTML elements are converted to Markdown.

### Compare schemas

```
pnpm schema:compare path/to/schema1.json path/to/schema2.json
```

## Key Components

### Enhanced Link Preservation

This tool ensures links are preserved exactly as they appear in the original HTML, without sanitizing or modifying URLs that might contain special characters or encoded paths.

### MathML Support

The built-in MathML to LaTeX converter accurately transforms mathematical content:

1. It properly translates MathML elements to LaTeX format
2. The LaTeX is wrapped in appropriate Markdown math delimiters ($...$ for inline math, $$...$$ for block math)
3. Complex formulas with fractions, square roots, and other symbols are properly represented

### SVG Chart Descriptions

SVG charts are converted to descriptive text in Markdown that explains the chart's purpose and key elements.

## Custom Schemas

The custom schema is a JSON file that defines how HTML elements should be converted to Markdown. It consists of rules for each HTML element type.

Example custom schema:

```json
{
  "rules": [
    {
      "name": "heading",
      "filter": ["h1", "h2", "h3", "h4", "h5", "h6"],
      "replacement": "function(content, node) { const level = parseInt(node.tagName.charAt(1)); return '\\n' + '#'.repeat(level) + ' ' + content + '\\n'; }"
    },
    {
      "name": "paragraph",
      "filter": "p",
      "replacement": "function(content) { return '\\n\\n' + content + '\\n\\n'; }"
    }
  ],
  "keep": [],
  "remove": []
}
```

## Development

### Run tests

```
pnpm test
```

### Run linting

```
pnpm lint
```

### Run in development mode

```
pnpm dev -- convert -u https://example.com
```

## License

MIT
