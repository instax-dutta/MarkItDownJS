# MarkItDownJS

> Universal document-to-Markdown conversion engine for TypeScript/JavaScript
> Convert PDFs, DOCX, PPTX, XLSX, HTML, CSV, JSON, XML, images, audio, EPUB, and archives into clean, LLM-friendly Markdown.

[![CI](https://github.com/your-org/markitdownjs/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/markitdownjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@markitdownjs/core)](https://www.npmjs.com/package/@markitdownjs/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **20+ format support** — PDF, DOCX, PPTX, XLSX, CSV, JSON, XML, HTML, EPUB, ZIP, images (OCR), audio
- **AST-first architecture** — Every converter produces a structured Abstract Syntax Tree
- **Multiple renderers** — Markdown, HTML, Plain Text, JSON output from the same AST
- **Intelligent chunking** — Heading-based, page-based, semantic, and fixed-size chunking for RAG workflows
- **Plugin architecture** — Register custom converters and middleware
- **React hooks** — `useDocumentParser()`, `useMarkdownConversion()`
- **Next.js integration** — API routes, Server Actions
- **CLI tool** — `markitdownjs convert`, `watch`, `batch`, `serve`
- **REST API** — Hono-based with `/convert`, `/batch`, `/health`, `/formats`
- **TypeScript-first** — Full type safety, ESM, tree-shakeable
- **Browser-compatible** — Works in browsers, Node.js, and edge runtimes

## Quick Start

```bash
npm install @markitdownjs/core @markitdownjs/pdf @markitdownjs/html
```

```typescript
import { MarkItDown } from '@markitdownjs/core';
import { PdfConverter } from '@markitdownjs/pdf';
import { HtmlConverter } from '@markitdownjs/html';

const parser = new MarkItDown();
parser.getRegistry().register(new PdfConverter());
parser.getRegistry().register(new HtmlConverter());

// Convert a file
const result = await parser.convert('./document.pdf');
console.log(result.markdown);

// Get the AST for custom processing
const ast = result.ast;

// Use chunking for RAG
const chunkResult = await parser.convert('./document.pdf', {
  chunking: { enabled: true, strategy: 'heading', maxTokens: 500 }
});
console.log(chunkResult.chunks);
```

## Architecture

```
Document (PDF, DOCX, etc.)
  → Converter (format-specific parser)
    → AST (DocumentNode tree)
      → Renderer (Markdown, HTML, PlainText, JSON)
        → Output

         ┌─────────────┐
         │   Input     │
         │  (File)     │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  Converter  │
         │  (PDF, etc) │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │    AST      │
         │ (DocumentNode)│
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│  MD   │  │ HTML  │  │ Plain │
│Render │  │Render │  │Text   │
└───────┘  └───────┘  └───────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `@markitdownjs/core` | Core engine with MarkItDown API |
| `@markitdownjs/shared` | Types, AST nodes, utilities |
| `@markitdownjs/ast` | AST renderers (Markdown, HTML, PlainText, JSON) |
| `@markitdownjs/chunking` | Document chunking for RAG workflows |
| `@markitdownjs/pdf` | PDF converter (pdf.js) |
| `@markitdownjs/docx` | DOCX converter (JSZip + XML) |
| `@markitdownjs/pptx` | PPTX converter |
| `@markitdownjs/xlsx` | XLSX converter |
| `@markitdownjs/html` | HTML converter |
| `@markitdownjs/csv` | CSV/TSV converter |
| `@markitdownjs/json` | JSON converter |
| `@markitdownjs/xml` | XML converter |
| `@markitdownjs/image-ocr` | Image OCR (tesseract.js) |
| `@markitdownjs/audio` | Audio transcription |
| `@markitdownjs/epub` | EPUB converter |
| `@markitdownjs/archive` | ZIP archive listing |
| `@markitdownjs/react` | React hooks & components |
| `@markitdownjs/next` | Next.js integration |
| `@markitdownjs/cli` | CLI tool |
| `@markitdownjs/api` | REST API server |

## Supported Formats

| Format | Extension | MIME Type | Features |
|--------|-----------|-----------|----------|
| PDF | `.pdf` | `application/pdf` | Text, headings, links, page breaks |
| DOCX | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Headings, tables, lists, formatting, hyperlinks |
| PPTX | `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | Slides, titles, speaker notes, tables |
| XLSX | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Multiple sheets, merged cells, tables |
| HTML | `.html` | `text/html` | Full semantic parsing |
| CSV | `.csv` | `text/csv` | Tables with headers |
| JSON | `.json` | `application/json` | Code blocks, array tables |
| XML | `.xml` | `application/xml` | Feed-aware, code blocks |
| EPUB | `.epub` | `application/epub+zip` | Chapters, structure |
| Images | `.png`, `.jpg`, `.webp`, `.gif`, `.tiff` | `image/*` | OCR text extraction |
| Audio | `.mp3`, `.wav`, `.m4a` | `audio/*` | Transcription (provider required) |
| Archive | `.zip` | `application/zip` | File listing |
| Text | `.txt`, `.md` | `text/plain`, `text/markdown` | Passthrough |

## Chunking for RAG

```typescript
import { MarkItDown } from '@markitdownjs/core';
import { PdfConverter } from '@markitdownjs/pdf';

const parser = new MarkItDown();
parser.getRegistry().register(new PdfConverter());

const result = await parser.convert('./document.pdf', {
  chunking: {
    enabled: true,
    strategy: 'heading', // 'heading' | 'page' | 'semantic' | 'fixed'
    maxTokens: 500,
    overlap: 50,
  }
});

for (const chunk of result.chunks!) {
  console.log(`Chunk ${chunk.id}:`);
  console.log(`  Heading path: ${chunk.metadata.headingPath.join(' > ')}`);
  console.log(`  Tokens: ${chunk.metadata.tokenCount}`);
  console.log(`  Content: ${chunk.content.substring(0, 100)}...`);
}
```

## React Usage

```tsx
import { useDocumentParser, MarkdownViewer } from '@markitdownjs/react';

function App() {
  const { convert, result, isConverting, error } = useDocumentParser();

  return (
    <div>
      <input type="file" onChange={(e) => e.target.files?.[0] && convert(e.target.files[0])} />
      {isConverting && <p>Converting...</p>}
      {error && <p style={{color: 'red'}}>{error.message}</p>}
      {result && <MarkdownViewer markdown={result.markdown} />}
    </div>
  );
}
```

## CLI Usage

```bash
# Convert a single file
npx markitdownjs convert document.pdf

# Convert to specific format
npx markitdownjs convert document.pdf --format json

# Watch directory for changes
npx markitdownjs watch ./documents

# Batch convert
npx markitdownjs batch ./documents --output ./output

# Start API server
npx markitdownjs serve --port 3000
```

## Development

```bash
# Clone the repository
git clone https://github.com/your-org/markitdownjs.git
cd markitdownjs

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Run benchmarks
pnpm vitest bench

# Development mode
pnpm run dev
```

## Migration from v0.1

v0.2 introduces AST-first architecture. The API is fully backward compatible:

```typescript
// v0.1 (still works in v0.2)
const result = await parser.convert(file);
console.log(result.markdown);

// v0.2 — new capabilities
const result = await parser.convert(file);
console.log(result.ast);           // Structured AST
console.log(result.chunks);        // RAG chunks (if chunking enabled)
console.log(result.metadata);      // Standardized metadata
```

## License

MIT
