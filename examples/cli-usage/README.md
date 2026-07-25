# CLI Usage Examples

Demonstrates how to use the MarkItDownJS CLI for converting documents, batch processing, watching directories, and serving an HTTP API.

## Commands

```bash
# Convert a single file
npx markitdownjs convert document.pdf

# Convert to a specific output
npx markitdownjs convert document.docx --output document.md

# Batch convert a directory
npx markitdownjs batch ./docs --output ./output

# Watch a directory for new files
npx markitdownjs watch ./inbox --output ./processed

# Start an HTTP API server
npx markitdownjs serve --port 3000

# List supported formats
npx markitdownjs formats
```
