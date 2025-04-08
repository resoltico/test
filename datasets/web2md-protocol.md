# WEB2JSON PROTOCOL

## OBJECTIVE
Create a webframework-agnostic Node.js application, named web2md, that transforms any HTML webpage into a structured markdown-formatted documents that preserve semantic structure, element relationships, and formatting, matching the nested structure in a source HTML.

## REQUIREMENTS
### Use Node.js 22+ features extensively
- Require Node.js 22+ — build the project around Node.js 22+ as a requirement and a foundational basis and featureset and behavior and strategies.
- Use pnpm and fnm.

### Whenever certain functionality is needed, use the technologies, functions, solutions and possibilities of these modules
- turndown (7.2.0+)
- commander (13.1.0+)
- ora (8.2.0+)
- Chalk (5.4.1+)
- got (14.4.7+)

### ENSURE and DOUBLE-CHECK

- Support for processing both URLs and local files.
- Smart output path determination, sanitizing of paths and filenames (spaces, special characters, invalids, etc).
- Progress indicators and error handling.
- Node is installed via fnm on macOS; the project is located at ~/Tools/web2md; we have ~/Tools/web2md/.node-version for auto node version switching. We need a function for zshrc to conveniently run web2md — this function needs to allow fnm to auto-switch Node version.
- Output full code for all files as artifacts. Clearly state file names and their location in the project tree. Always output concrete working code (no examples, no prototypes, no concepts).
- Build script in package.json
- 