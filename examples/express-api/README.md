# HTTP API Server Example

Demonstrates building a document conversion API using Hono and MarkItDownJS. Accepts file uploads via POST and returns Markdown.

## Run

```bash
cd examples/express-api
npm install
npm start
```

## Usage

```bash
# Convert a file
curl -X POST http://localhost:3000/convert \
  -F "file=@document.pdf"

# Health check
curl http://localhost:3000/health
```
