# web2md

A Node.js application that transforms HTML webpages into structured markdown documents while preserving semantic structure, element relationships, and formatting.

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

3. Link the package globally:
   ```
   pnpm link --global
   ```

## Usage

### Command Line

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
- `-h, --help`: Display help information
- `-V, --version`: Display version number

### Subcommands

#### Convert a single source

```
web2md convert <source> [options]
```

#### Batch convert multiple sources

```
web2md batch <file> [options]
```

Additional options for batch conversion:
- `-c, --concurrency <number>`: Maximum number of concurrent conversions (default: 3)

### Examples

Convert a webpage to Markdown:
```
web2md https://example.com
```

Convert a local HTML file to Markdown:
```
web2md index.html
```

Specify an output directory:
```
web2md https://example.com -o ./output
```

Force overwrite of existing files:
```
web2md https://example.com -f
```

Batch convert URLs from a file:
```
web2md batch urls.txt -o ./output -c 5
```

### API

You can also use web2md programmatically:

```javascript
import { convertToMarkdown } from 'web2md';

async function example() {
  const outputPath = await convertToMarkdown('https://example.com', {
    outputDir: './output',
    force: true,
    timeout: 30000,
    maxRetries: 3
  });
  
  console.log(`Converted to ${outputPath}`);
}

example().catch(console.error);
```

## Features

- Converts HTML from URLs or local files to Markdown
- Preserves semantic structure and element relationships
- Supports batch processing of multiple sources
- Smart output path determination and sanitization
- Comprehensive error handling with retries
- Progress indicators for command-line usage

## Node.js 22+ Features

This project leverages several Node.js 22+ features:
- ES modules
- Structured error handling
- Promise-based APIs
- Asynchronous file system operations
- Structured concurrency with Promise.allSettled
- Atomicity guarantees for file operations

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