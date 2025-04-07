# WEB2JSON PROTOCOL

## OBJECTIVE
Create a framework-agnostic Node.js application that transforms any HTML webpage into a structured JSON format that preserves semantic structure, element relationships, and formatting, matching the nested indented tree structure observed in the example JSON output “dataset-comprehensive-html5-demo.json” that is based on the source input “dataset-comprehensive-html5-demo.html".

## REQUIREMENTS
### Use Node.js 22+ features extensively
6. **Require Node.js 22+** — build the project around Node.js 22+ as a requirement and a foundational basis and featureset and behavior and strategies.
7. **Require hierarchical nested tree indented JSON output** - No flat JSON output — we need only a hierarchical nested tree JSON; we absolutely do not need a flat JSON, not even as an option. “Pretty” is the only kind of output — no other output alternatives can be presents — therefore there must be no such argument in cli — because this is the only option.
8. **Use pnpm and fnm**

### Use the technologies, functions, solutions and possibilities of these modules
1. **Cheerio** (1.0.0+) - use TypeScript definitions from the file “cheerio-index.d.ts” (I download it from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cheerio/index.d.ts). Also examine Cheerio dist files in the “dist” folder and its folders.
2. **Zod** (3.24.2+) - 
3. **TypeScript** (5.8.3+ )- 
4. **html-entities** (2.6.0+) - 
5. **sanitize-html** (2.15.0+) - 
6. commander (13.1.0+) - 
7. ora (8.2.0+) - 
8. Chalk (5.4.1+) - 
9. tsx (4.19.3+) - 
10. ESLint (9.24.0+)
11. got  (14.4.7+)

### ENSURE and DOUBLE-CHECK

- That there are no circular references in schema definitions
- That there are no missing Cheerio type exports

## PROCESSING ALGORITHM

### 1. HTML Parsing Approach
- Load HTML content using Cheerio with configuration that preserves original content
- Maintain HTML entities and formatting in the parsed structure
- Leverage Node's enhanced string processing capabilities for efficient parsing

### 2. Document Information Extraction
- Extract document metadata from head elements (title, meta tags, etc.)
- Capture base URL information for resolving relative paths
- Utilize structured metadata extraction based on document type detection

### 3. Section Hierarchy Construction
- Identify all heading elements (h1-h6) to establish document structure
- Create a hierarchical tree based on heading levels
- Implement a stack-based algorithm to maintain proper parent-child relationships
- Associate content with appropriate section based on document flow

### 4. Content Extraction Strategy
- Process elements between headings to extract section content
- Determine element type and delegate to appropriate specialized processor
- Preserve HTML formatting in text content
- Extract and structure special elements like tables, forms, and figures
- Handle nested content with proper context preservation

### 5. Special Element Processing

#### Table Processing
- Extract table structure including headers, rows, and footer
- Preserve cell content with proper text normalization
- Handle colspan and rowspan attributes for complex tables
- Process caption element for table context

#### Form Processing
- Extract form field structure with field types, labels, and validation rules
- Identify field options for select, radio, and checkbox inputs
- Preserve form layout structure
- Process fieldsets and associated legends

#### Figure Processing
- Extract figure captions
- Special handling for SVG content with element structure preservation
- Process image references and preserve alt text
- Handle complex figures with multiple content elements

#### Quote Processing
- Extract quote content with citation/source information
- Preserve attribution and reference details
- Handle nested content within blockquotes

#### Aside Processing
- Process aside elements as specialized content blocks
- Preserve heading structure within asides
- Handle nested content with proper hierarchy

### 6. Final JSON Construction
- Assemble document structure from processed components
- Validate against schema to ensure structural integrity
- Apply consistent property ordering for stable output
- Include metadata and source information


## HANDLING RULES

1. **HTML Content Preservation**
   - Preserve HTML formatting in content strings
   - Keep element attributes in content strings
   - Maintain special elements like time, ruby, abbr

2. **Section Hierarchy**
   - Build hierarchy based on heading levels (h1-h6)
   - Preserve parent-child relationships
   - Include content between headings with the appropriate section

3. **Special Element Handling**
   - Convert tables to structured objects with headers, rows, footer
   - Transform forms into field descriptions
   - Process figures with special handling for SVG content
   - Convert blockquotes to quote objects with source
   - Handle ordered and unordered lists appropriately
   - Process definition lists with term-definition pairs
   - Handle math elements when present

4. **Element ID Preservation**
   - Maintain IDs from original HTML elements when available
   - Use IDs for reference within the JSON structure

5. **Edge Cases**
   - Handle empty elements gracefully
   - Manage overlapping or inconsistent heading levels
   - Process nested special elements appropriately

## RECAP

See the attached dataset "dataset-comprehensive-html5-demo.html” and "dataset-comprehensive-html5-demo.json" (the json was created from the same html; and I want this project to write the same json given the same html input -- I mean in the context of this dataset -- but obviously our project needs to be webpage, website, web-framework agnostic and abstracted). Proceed to generate concrete working code (no examples, no prototypes, no concepts). Clearly state file names and their location in the project tree.
Let's develop Node based app for desktop (primarily macOS) to fetch individual webpages (specified by user in cli) from the internet, transform them to JSON files, and save JSON files on local disk.
Use Node v22+ features in techniques and all features and functions of Node v22+. Use any external Node modules. Use pnpm for management.
Do not generate tests — we will leave it for another time. Output project files as artifacts. The app is to be primarily used on macOS desktop (use fnm and pnpm) — generate README how to install on macOS and generate a function for zshrc (because aliases are problematic with arguments).
**Require hierarchical nested tree indented JSON** - No flat JSON output — we need only a hierarchical nested tree JSON; we absolutely do not need a flat JSON, not even as an option. “Pretty” is the only kind of output — no other output alternatives can be presents — therefore there must be no such argument in cli — because this is the only option.
Node is installed via fnm on macOS; the project is located at ~/Tools/web2json; we have ~/Tools/web2json/.node-version for auto node version switching. We need a function for zshrc to conveniently run web2json — this function needs to allow fnm to auto-switch Node version — examine code below and fix and improve if necessary:
# Add this to your ~/.zshrc file

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