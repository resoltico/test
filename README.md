# Web2JSON

A modern Python tool for transforming web pages into structured JSON.

## Features

- **Hierarchical Structure**: Transforms flat HTML heading structures (`h1-h6`) into nested JSON hierarchies
- **Semantic Preservation**: Maintains the semantic meaning of HTML elements
- **Specialized Processors**: Custom handlers for tables, forms, media, and semantic elements
- **Efficient Fetching**: Asynchronous fetching with caching and retry support
- **Customizable**: Configurable processing and output options
- **Command-Line Interface**: Easy-to-use CLI for batch processing

## Installation

### Using Poetry (recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/web2json.git
cd web2json

# Install with Poetry
poetry install
```

### Using pip

```bash
pip install git+https://github.com/yourusername/web2json.git
```

## Usage

### Basic Usage

```bash
# Transform a single URL
web2json convert https://example.com

# Transform multiple URLs
web2json convert https://example.com https://another-site.com

# Specify an output directory
web2json convert https://example.com --output-dir ./json-output
```

### Configuration

You can configure the tool using the `config` command:

```bash
# Show current configuration
web2json config --show

# Set a configuration value
web2json config --set "output.indent=4"

# Reset to default configuration
web2json config --reset
```

### Python API

You can also use Web2JSON as a library in your Python code:

```python
import asyncio
from web2json.core.fetcher import WebFetcher
from web2json.core.transformer import Transformer
from web2json.core.serializer import JsonSerializer
from web2json.models.config import Web2JsonConfig

async def transform_url(url):
    # Load default configuration
    config = Web2JsonConfig.create_default()
    
    # Create components
    transformer = Transformer.create_default(config)
    serializer = JsonSerializer(config.output)
    
    # Fetch the URL
    async with WebFetcher(config.fetch) as fetcher:
        html = await fetcher.fetch_url(url)
    
    # Transform to structured document
    document = transformer.transform(html, url)
    
    # Serialize and save
    output_path = serializer.save_to_file(document)
    print(f"Output saved to: {output_path}")

# Run the function
asyncio.run(transform_url("https://example.com"))
```

## Output Format

The output JSON has a hierarchical structure that preserves the semantic meaning of the original HTML:

```json
{
  "title": "Example Website",
  "url": "https://example.com",
  "content": [
    {
      "type": "section",
      "title": "Introduction",
      "level": 1,
      "content": [
        "Welcome to the example website.",
        {
          "type": "paragraph",
          "text": "This is an example paragraph."
        }
      ],
      "children": [
        {
          "type": "section",
          "title": "Subsection",
          "level": 2,
          "content": [
            {
              "type": "table",
              "headers": [
                [{"text": "Header 1"}, {"text": "Header 2"}]
              ],
              "rows": [
                [{"text": "Cell 1"}, {"text": "Cell 2"}],
                [{"text": "Cell 3"}, {"text": "Cell 4"}]
              ]
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "title": "Example Website",
    "description": "An example website for demonstration"
  }
}
```

## Development

### Requirements

- Python 3.13+
- Poetry

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/web2json.git
cd web2json

# Install dependencies
poetry install

# Install development dependencies
poetry install --with dev
```

### Running Tests

```bash
poetry run pytest
```

## License

MIT
