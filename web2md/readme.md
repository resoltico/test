# web2md

A Node.js application that transforms HTML webpages into structured markdown documents while preserving semantic structure, element relationships, and formatting. web2md uses a carefully designed custom conversion schema to produce clean, readable Markdown that prioritizes content flow and presentation.

## Features

- Convert HTML from URLs or local files to well-formatted Markdown
- Custom schema system for controlling how HTML elements are converted
- Batch processing for multiple sources
- Intelligent handling of complex HTML elements (tables, forms, ruby annotations)
- Content-focused conversion that prioritizes readability
- Comprehensive error handling with automatic retries
- Multiple schema presets for different conversion needs

## Requirements

- Node.js 22.0.0 or higher
- pnpm package manager
- fnm (Fast Node Manager)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/web2md.git ~/Tools/web2md
   cd ~/Tools/web2md
   ```

2. Install dependencies using pnpm:
   ```
   pnpm install
   ```

3. Build the project:
   ```
   pnpm run build
   ```

4. Link the package globally:
   ```
   pnpm link --global
   ```

## Usage

### Command Line

The basic syntax for using web2md is:

```
web2md <source> [options]
```

#### Arguments

- `source`: URL or file path to convert

#### Options

- `-o, --output <directory>`: Output directory (default: current directory)
- `-f, --force`: Overwrite existing files
- `-t, --timeout <ms>`: Timeout in milliseconds (default: 30000)
- `-r, --retries <number>`: Maximum number of retries (default: 3)
- `-s, --schema <preset>`: Conversion schema preset (default: "standard")
- `--schema-file <file>`: Path to custom schema file (required for custom schema)
- `-h, --help`: Display help information
- `-V, --version`: Display version number

### Subcommands

#### Convert a single source

```
web2md convert <source> [options]
```

Example: `web2md convert https://example.com -o ./output -s structured`

#### Batch convert multiple sources

```
web2md batch <file> [options]
```

Example: `web2md batch urls.txt -o ./output -c 5`

Additional options for batch conversion:
- `-c, --concurrency <number>`: Maximum number of concurrent conversions (default: 3)

#### Create a schema template

```
web2md create-schema [output-file]
```

Example: `web2md create-schema my-custom-schema.json`

## Default Conversion Schema

Web2md uses a custom-designed HTML-to-Markdown conversion schema by default (the "standard" schema). This schema prioritizes content flow and readability while intelligently handling special HTML elements. It implements a specific set of conversion rules that significantly override Turndown's default behavior.

### Key Features of the Default Schema

The default schema implements the following conversion strategies:

1. **Content-focused rather than structure-preserving**
   - Semantic HTML elements are primarily transformed based on their content
   - Nested structures are flattened while maintaining logical flow

2. **Heading hierarchy preservation**
   - HTML headings (h1-h6) map to Markdown headings (#-######)
   - Heading styles are consistent with proper spacing before and after

3. **Special element handling**
   - Ruby annotations are simplified (e.g., `<ruby>古い<rt>furui</rt></ruby>` → `古い (furui)`)
   - Forms are converted to readable text blocks with labeled fields
   - Tables are properly formatted with aligned columns
   - SVGs and other visual elements are described textually
   - Blockquotes preserve citations

4. **Text formatting**
   - Emphasis elements (`<i>`, `<em>`) convert to *italics*
   - Strong elements (`<b>`, `<strong>`) convert to **bold**
   - Code elements (`<code>`, `<kbd>`) convert to `inline code`
   - Definition elements (`<dfn>`) convert to *italics*
   - Strikethrough (`<s>`) converts to ~~strikethrough~~

### How It Works: Schema Implementation

The default schema is implemented in `src/converter.js` and works by overriding Turndown's built-in rules with custom replacement functions. Here's how it takes precedence over Turndown's default behavior:

1. We first configure Turndown with base settings:
   ```javascript
   const turndownService = new TurndownService({
     headingStyle: 'atx',        // Use # style headings
     codeBlockStyle: 'fenced',   // Use ``` style code blocks
     // Other configuration...
   });
   ```

2. We then define custom rules that override Turndown's defaults:
   ```javascript
   turndownService.addRule('paragraph', {
     filter: 'p',
     replacement: function(content) {
       return '\n\n' + content + '\n\n';
     }
   });
   
   // Many more custom rules...
   ```

3. According to Turndown's rule precedence system, **added rules** (our custom ones) take priority over **Commonmark rules** (Turndown's defaults). The order of precedence is:
   - Blank rule
   - Added rules (our custom rules)
   - Commonmark rules (Turndown's defaults)
   - Keep rules
   - Remove rules
   - Default rule

This approach gives us complete control over the conversion process while still leveraging Turndown's robust HTML parsing capabilities.

## Alternative Schema Presets

Web2md offers several pre-defined schema presets for different conversion needs:

### standard (Default)
The content-focused schema described above that prioritizes readability.

### structured
Preserves HTML document structure by including HTML comments to indicate container elements:
```markdown
<!-- header start -->
# Title
<!-- header end -->

<!-- section#main start -->
Content...
<!-- section#main end -->
```

### clean
A minimal formatting schema that focuses on pure content without preserving special elements:
```markdown
# Title

Content in a simple, clean format.
```

## Creating a Custom Schema

If the pre-defined schemas don't meet your needs, you can create a custom schema:

1. Generate a template:
   ```bash
   web2md create-schema my-schema.json
   ```

2. Edit the generated file to customize element handling:
   ```json
   {
     "preserveStructure": false,
     "flattenContainers": true,
     "handleSpecialElements": true,
     "elementRules": {
       "ruby": {
         "filter": "ruby",
         "replacement": "function(content, node) { /* custom replacement */ }"
       }
     }
   }
   ```

3. Use your custom schema:
   ```bash
   web2md example.html --schema custom --schema-file my-schema.json
   ```

## Examples

Here are some common usage examples:

### Converting a webpage with default schema
```bash
web2md https://example.com
```

### Converting a local HTML file
```bash
web2md path/to/file.html -o ./output
```

### Using the structured schema preset
```bash
web2md https://example.com --schema structured -o ./structured-output
```

### Overwriting existing files
```bash
web2md https://example.com --force
```

### Batch converting from a list of URLs
```bash
# Create a file with URLs, one per line
echo "https://example.com" > urls.txt
echo "https://another-site.org" >> urls.txt

# Convert all URLs
web2md batch urls.txt -o ./batch-output -c 2
```

### Creating and using a custom schema
```bash
# Create the schema template
web2md create-schema my-schema.json

# Edit the file to customize conversions
# Then use it
web2md https://example.com --schema custom --schema-file my-schema.json
```

## API

You can use web2md programmatically in your Node.js applications:

```javascript
import { convertToMarkdown } from 'web2md';

async function example() {
  const outputPath = await convertToMarkdown('https://example.com', {
    outputDir: './output',
    force: true,
    timeout: 30000,
    maxRetries: 3,
    schema: 'standard' // Or 'structured', 'clean', 'custom'
    // schemaFile: './my-schema.json' // Only needed with schema: 'custom'
  });
  
  console.log(`Converted to ${outputPath}`);
}

example().catch(console.error);
```

For advanced customization:

```javascript
import { convertToMarkdownWithSchema } from 'web2md';

async function customExample() {
  const outputPath = await convertToMarkdownWithSchema('https://example.com', {
    outputDir: './output',
    schemaOptions: {
      preserveStructure: true,
      flattenContainers: false,
      customElementRules: {
        // Custom rules for specific HTML elements
        'my-element': {
          filter: 'my-element',
          replacement: (content) => `Custom content: ${content}`
        }
      }
    }
  });
  
  console.log(`Converted to ${outputPath} with custom schema`);
}

customExample().catch(console.error);
```

## Development

If you're contributing to web2md or want to understand how it works internally, this section provides information about the development process.

### Project Structure

```
~/Tools/web2md/
├── bin/                    # CLI entry point
│   └── web2md.js           # Command-line executable
├── src/                    # Source code
│   ├── cli.js              # Command-line interface
│   ├── converter.js        # HTML to Markdown conversion
│   ├── fetcher.js          # HTML fetching functionality
│   ├── index.js            # Main API
│   ├── schema-loader.js    # Schema loading and processing
│   └── utils.js            # Utility functions
└── test/                   # Tests
    ├── schema-implementation.test.js  # Schema verification tests
    └── test.js             # General functionality tests
```

### Schema Implementation Verification

The project includes a comprehensive test suite specifically for verifying that our custom schema implementation correctly overrides Turndown's default behavior. These tests ensure that:

1. **Rule Precedence** - Our custom rules properly take precedence over Turndown's built-in rules
2. **Standard Schema** - The default conversion schema correctly implements our specific formatting requirements
3. **Custom Schema** - The schema customization system works as expected
4. **Complete Conversion** - Complex HTML documents are converted according to our defined conventions

#### Running the Schema Verification Tests

To run the schema implementation verification tests:

```bash
cd ~/Tools/web2md
npm test
```

Or to run just the schema tests:

```bash
node --test test/schema-implementation.test.js
```

#### What the Verification Tests Check

The schema verification tests validate multiple aspects of the conversion process:

1. **Rule Override**: Tests that custom rules successfully override Turndown's default rules
2. **Element Formatting**: Verifies that specific HTML elements (ruby annotations, tables, mark elements) are formatted according to our schema
3. **Custom Schema Loading**: Confirms that custom schemas can be loaded from files and properly applied
4. **Complete Document Processing**: Ensures that complex HTML documents with multiple elements are converted correctly

These tests are crucial for maintaining the integrity of the conversion process, especially when making changes to the schema implementation.

### Extending the Project

If you want to extend web2md:

1. **Adding New Schema Presets**: Edit `src/schema-loader.js` to add new preset configurations
2. **Enhancing Element Rules**: Modify `src/converter.js` to change how specific HTML elements are converted
3. **Adding CLI Features**: Extend `src/cli.js` to add new command-line options or commands
4. **Creating Tests**: Add tests in the `test/` directory to verify new functionality

Remember to update the tests when changing the schema implementation to ensure your changes work as expected.

## ZSH Integration

Add the following function to your `~/.zshrc` file for convenient usage:

```zsh
function web2md() {
  (
    cd ~/Tools/web2md
    fnm use
    node bin/web2md.js "$@"
  )
}
```

This function automatically switches to the correct Node.js version using fnm and runs the web2md command.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
