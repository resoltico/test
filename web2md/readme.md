# WEB2MD

A Node.js CLI application that transforms HTML webpages into semantically structured Markdown documents with high fidelity.

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Rules System: Complete Guide](#rules-system-complete-guide)
  - [What Are Rules?](#what-are-rules)
  - [Built-in Rules](#built-in-rules)
  - [Configuration File (.web2md.json)](#configuration-file-web2mdjson)
  - [How to Create Custom Rules](#how-to-create-custom-rules)
  - [Rule Precedence and Order](#rule-precedence-and-order)
  - [Common Rule Patterns](#common-rule-patterns)
  - [Troubleshooting Rules](#troubleshooting-rules)
- [Configuration Options](#configuration-options)
- [CLI Options Reference](#cli-options-reference)
- [Examples](#examples)
- [License](#license)

## Features

- Convert HTML files to Markdown
- Convert web pages to Markdown
- Customizable conversion rules
- Configurable output format
- Project-specific configuration
- Support for math expressions
- Highly extensible rule system

## Requirements

- Node.js v22.14.0 or higher
- npm or pnpm for package management

## Installation

### From Source

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

### Shell Setup (macOS/Linux)

Add the provided shell function to your ~/.zshrc file for easy access and automatic Node version switching:

```bash
# web2md zsh function with path handling and fnm support
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

## Basic Usage

```bash
# Convert an HTML file to Markdown
web2md -f input.html -o output.md

# Convert a web page to Markdown
web2md -u https://example.com -o example.md

# Enable debug mode
web2md -f input.html -o output.md --debug

# Print output to stdout instead of a file
web2md -f input.html
```

## Rules System: Complete Guide

### What Are Rules?

In web2md, a "rule" is the basic building block that determines how HTML elements are converted to Markdown. Think of each rule as a specialized tool in a toolbox, with each one designed to handle a specific type of HTML element.

**In simple terms**: A rule says "When you see this HTML element, convert it to this Markdown format."

Each rule consists of three essential parts:

1. **Name**: A unique identifier (e.g., "headings", "boldText")
2. **Filter**: Determines which HTML elements the rule applies to
3. **Replacement**: Defines how to convert matching elements to Markdown

For example, a simple rule for converting `<h1>` elements might be:
- **Name**: "heading1"
- **Filter**: Matches all `<h1>` tags
- **Replacement**: Converts to `# Heading Text`

### Built-in Rules

Web2md comes with a complete set of built-in rules that handle common HTML elements. These rules are organized into different categories for better organization:

| Category | File | Description | Examples |
|----------|------|-------------|----------|
| **common/elements** | elements.yaml | Basic HTML structural elements | Headings, paragraphs, lists, blockquotes |
| **text/formatting** | formatting.yaml | Text styling and formatting | Bold, italic, strikethrough, code |
| **text/links** | links.yaml | Hyperlinks and references | Standard links, image links |
| **media/images** | images.yaml | Image handling | Images, figures, captions |
| **tables/tables** | tables.yaml | Table conversion | Table headers, cells, rows |
| **code/blocks** | blocks.yaml | Code formatting | Code blocks with language highlighting |
| **math/math** | math.js | Mathematical expressions | Inline and display math formulas |

**Important**: The current version of web2md includes EXACTLY these seven built-in rule files. When you use the default configuration, all of these rules are automatically applied.

### Configuration File (.web2md.json)

The `.web2md.json` file is where you control which rules are used and how they're configured. This file should be placed in the root directory of your project.

#### Basic Configuration Structure

```json
{
  "headingStyle": "atx",
  "listMarker": "-",
  "codeBlockStyle": "fenced",
  "preserveTableAlignment": true,
  "ignoreTags": ["script", "style", "noscript", "iframe"],
  "rules": [
    "built-in:common/elements",
    "built-in:text/formatting",
    "built-in:text/links",
    "built-in:media/images",
    "built-in:tables/tables",
    "built-in:code/blocks",
    "built-in:math/math"
  ],
  "debug": false
}
```

#### The "rules" Array - Explained in Detail

The `"rules"` array is the heart of your configuration. It determines which rules are used and in what order they're applied.

Each entry follows this format:
- **Built-in rules**: `"built-in:category/name"`
- **Custom rules**: `"./path/to/rule.yaml"` or `"./path/to/rule.js"`

**Special Note About JSON**: The JSON format does not support comments. If you want to add notes to your configuration file, you can add fields with names starting with an underscore (like `"_note": "This is my note"`) which web2md will ignore.

#### Rules Array Behavior

There are three important things to understand about the rules array:

1. **Order Matters**: Rules are applied in the order they appear. Later rules can override earlier ones.

2. **Explicit List Required**: When you specify a `rules` array, ONLY the rules you list will be used. If you leave out a built-in rule, it won't be applied.

3. **No Rules Array = Use All Built-ins**: If you don't include a `rules` array in your configuration, web2md will automatically use ALL built-in rules.

**Example: Using Only Bold and Italics Rules**
```json
{
  "rules": [
    "built-in:text/formatting"
  ]
}
```
This would ONLY apply the text formatting rules - headings, lists, and other elements would not be converted properly.

**Example: Using All Built-ins Plus Custom Rule**
```json
{
  "rules": [
    "built-in:common/elements",
    "built-in:text/formatting",
    "built-in:text/links",
    "built-in:media/images",
    "built-in:tables/tables",
    "built-in:code/blocks",
    "built-in:math/math",
    "./my-rules/custom.yaml"
  ]
}
```

**Example: No Rules Array (Use All Built-ins Automatically)**
```json
{
  "headingStyle": "atx",
  "listMarker": "-"
}
```

### How to Create Custom Rules

#### Option 1: YAML Rules (Simple)

YAML rules are perfect for straightforward conversions without complex logic. Create a file with the `.yaml` or `.yml` extension:

```yaml
rules:
  notebox:
    filter: "div.note"
    replacement: "> **Note:** {content}\n\n"
```

Available placeholders in the replacement string:
- `{content}`: The processed content inside the element
- `{attr:name}`: The value of an attribute (e.g., `{attr:href}` for links)
- `{raw}`: The raw HTML content

#### Option 2: JavaScript Rules (Advanced)

JavaScript rules give you full programmatic control. Create a file with the `.js` extension:

```javascript
export default {
  name: 'customAlert',
  
  filter: (node) => {
    // Check if this is a div with class 'alert'
    return node.nodeName === 'DIV' && 
           node.classList.contains('alert');
  },
  
  replacement: (content, node) => {
    // Get the alert type from the class list
    const classes = Array.from(node.classList);
    let alertType = 'info';
    
    if (classes.includes('alert-warning')) alertType = 'warning';
    if (classes.includes('alert-danger')) alertType = 'danger';
    if (classes.includes('alert-success')) alertType = 'success';
    
    // Return formatted markdown
    return `> **${alertType.toUpperCase()}:** ${content}\n\n`;
  }
};
```

### Rule Precedence and Order

Rules in web2md follow a strict precedence order:

1. **CLI Override**: Rules specified with `--rules-dir` flag (highest priority)
2. **Configuration File**: Rules listed in `.web2md.json`
3. **Default Built-ins**: Used if no rules are specified (lowest priority)

Within each source, rules are applied in the order they're defined. This means:

- Later rules can override earlier ones
- Order in your rules array matters
- Custom rules should usually come after built-in rules

### Common Rule Patterns

Here are some common patterns for rules:

#### 1. Replacing the Built-in Rules

If you want to completely replace a built-in rule:

```json
{
  "rules": [
    "built-in:common/elements",
    "./my-rules/custom-formatting.yaml",  // This will override built-in:text/formatting
    "built-in:text/links",
    "built-in:media/images",
    "built-in:tables/tables",
    "built-in:code/blocks",
    "built-in:math/math"
  ]
}
```

#### 2. Extending the Built-in Rules

If you want to keep all built-in rules but add your own:

```json
{
  "rules": [
    "built-in:common/elements",
    "built-in:text/formatting",
    "built-in:text/links",
    "built-in:media/images",
    "built-in:tables/tables",
    "built-in:code/blocks",
    "built-in:math/math",
    "./my-rules/extra-rules.yaml"  // This adds your custom rules
  ]
}
```

#### 3. Using Only Custom Rules

If you want to bypass all built-in rules:

```json
{
  "rules": [
    "./my-rules/my-complete-ruleset.yaml"
  ]
}
```

### Troubleshooting Rules

If your rules aren't working as expected:

1. **Enable Debug Mode**: Run with `--debug` to see detailed logging
2. **Check Rule Order**: Make sure your rules are in the right order
3. **Verify Rule Paths**: Ensure paths to custom rule files are correct
4. **Inspect HTML Structure**: Sometimes the HTML structure isn't what you expect

Common Issues:
- **Rule Not Applied**: Your filter might not match the actual HTML
- **Unexpected Output**: Another rule might be overriding yours
- **Missing Content**: Check for nested elements that need separate rules

## Configuration Options

The `.web2md.json` file supports the following options:

| Option | Description | Values | Default |
|--------|-------------|--------|---------|
| `headingStyle` | Style of headings | `"atx"` (`#`) or `"setext"` (underlined) | `"atx"` |
| `listMarker` | Character for unordered lists | `"-"`, `"*"`, or `"+"` | `"-"` |
| `codeBlockStyle` | Style for code blocks | `"fenced"` (```) or `"indented"` (4 spaces) | `"fenced"` |
| `preserveTableAlignment` | Keep table column alignment | `true` or `false` | `true` |
| `ignoreTags` | HTML tags to ignore completely | Array of tag names | `[]` |
| `rules` | Rules to apply | Array of rule paths | All built-in rules |
| `debug` | Enable detailed logging | `true` or `false` | `false` |

## CLI Options Reference

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

## Examples

### Basic Conversion

**Example 1: Converting a Local HTML File**
```bash
web2md -f document.html -o document.md
```

**Example 2: Converting a Web Page**
```bash
web2md -u https://example.com -o example.md
```

### Custom Rule Examples

**Example: Custom Note Boxes**

HTML:
```html
<div class="note">
  <p>This is an important note.</p>
</div>
```

Custom Rule (my-rules/notes.yaml):
```yaml
rules:
  note:
    filter: "div.note"
    replacement: "> **Note:** {content}\n\n"
```

Configuration (.web2md.json):
```json
{
  "rules": [
    "built-in:common/elements",
    "built-in:text/formatting",
    "built-in:text/links",
    "built-in:media/images",
    "built-in:tables/tables",
    "built-in:code/blocks",
    "built-in:math/math",
    "./my-rules/notes.yaml"
  ]
}
```

Result:
```markdown
> **Note:** This is an important note.
```

**Example: Custom Alert Levels with JavaScript**

HTML:
```html
<div class="alert alert-warning">
  <p>Warning: This action cannot be undone.</p>
</div>
```

Custom Rule (my-rules/alerts.js):
```javascript
export default {
  name: 'alert',
  
  filter: (node) => {
    return node.nodeName === 'DIV' && node.classList.contains('alert');
  },
  
  replacement: (content, node) => {
    let alertType = 'INFO';
    
    if (node.classList.contains('alert-warning')) alertType = 'WARNING';
    if (node.classList.contains('alert-danger')) alertType = 'DANGER';
    if (node.classList.contains('alert-success')) alertType = 'SUCCESS';
    
    return `> **${alertType}:** ${content}\n\n`;
  }
};
```

Result:
```markdown
> **WARNING:** Warning: This action cannot be undone.
```

## License

MIT
