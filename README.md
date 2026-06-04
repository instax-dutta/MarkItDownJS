# MarkItDownJS

**Universal document ingestion and conversion platform for TypeScript.**

Transform any document — PDF, DOCX, PPTX, XLSX, HTML, EPUB, CSV, JSON, XML, images, audio, archives — into structured, AI-ready data. AST-first architecture. Plugin-based. Zero Python.

[![CI](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/ci.yml/badge.svg)](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/ci.yml)
[![CodeQL](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/codeql.yml/badge.svg)](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/@markitdownjs/core?color=cb3837)](https://www.npmjs.com/package/@markitdownjs/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

## Why MarkItDownJS

Most document processing tools in the JS ecosystem are shallow wrappers — convert to Markdown and stop. MarkItDownJS is built for AI pipelines:

- **AST-first** — every converter produces a structured `DocumentNode` tree, not raw text. Renderers are swappable.
- **Chunking as a first-class feature** — heading, page, semantic, and token chunking with full metadata per chunk (`headingPath`, `pageNumber`, `tokenCount`).
- **No Python** — pure TypeScript, runs natively in Node.js, Bun, Deno, Electron, and browsers.
- **Plugin architecture** — `registerConverter()`, `registerRenderer()`, `registerChunker()`. Core never knows implementation details.
- **20 packages, one pipeline** — format-specific packages, a shared AST, and a core orchestrator.

---

## Install

Install the core plus any format converters you need:

```bash
npm install @markitdownjs/core @markitdownjs/pdf @markitdownjs/docx
```

---

## Quick Start

```typescript
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";
import { DocxConverter } from "@markitdownjs/docx";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());
parser.registerConverter(new DocxConverter());

// Convert to Markdown
const result = await parser.convert({ source: fileBuffer, mimeType: "application/pdf" });
console.log(result.markdown);

// Access the AST directly
console.log(result.ast);

// Chunk for RAG
console.log(result.chunks);
```

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@markitdownjs/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@markitdownjs/core?label=)](https://www.npmjs.com/package/@markitdownjs/core) | Core parser, registry, and pipeline |
| [`@markitdownjs/shared`](./packages/shared) | [![npm](https://img.shields.io/npm/v/@markitdownjs/shared?label=)](https://www.npmjs.com/package/@markitdownjs/shared) | AST types, errors, utilities |
| [`@markitdownjs/ast`](./packages/ast) | [![npm](https://img.shields.io/npm/v/@markitdownjs/ast?label=)](https://www.npmjs.com/package/@markitdownjs/ast) | Renderers: Markdown, HTML, JSON, plain text |
| [`@markitdownjs/chunking`](./packages/chunking) | [![npm](https://img.shields.io/npm/v/@markitdownjs/chunking?label=)](https://www.npmjs.com/package/@markitdownjs/chunking) | Heading, page, token, semantic chunking |
| [`@markitdownjs/pdf`](./packages/pdf) | [![npm](https://img.shields.io/npm/v/@markitdownjs/pdf?label=)](https://www.npmjs.com/package/@markitdownjs/pdf) | PDF converter (pdf.js) |
| [`@markitdownjs/docx`](./packages/docx) | [![npm](https://img.shields.io/npm/v/@markitdownjs/docx?label=)](https://www.npmjs.com/package/@markitdownjs/docx) | DOCX converter |
| [`@markitdownjs/pptx`](./packages/pptx) | [![npm](https://img.shields.io/npm/v/@markitdownjs/pptx?label=)](https://www.npmjs.com/package/@markitdownjs/pptx) | PowerPoint converter |
| [`@markitdownjs/xlsx`](./packages/xlsx) | [![npm](https://img.shields.io/npm/v/@markitdownjs/xlsx?label=)](https://www.npmjs.com/package/@markitdownjs/xlsx) | Excel converter |
| [`@markitdownjs/html`](./packages/html) | [![npm](https://img.shields.io/npm/v/@markitdownjs/html?label=)](https://www.npmjs.com/package/@markitdownjs/html) | HTML converter (Readability) |
| [`@markitdownjs/csv`](./packages/csv) | [![npm](https://img.shields.io/npm/v/@markitdownjs/csv?label=)](https://www.npmjs.com/package/@markitdownjs/csv) | CSV/TSV converter |
| [`@markitdownjs/json`](./packages/json) | [![npm](https://img.shields.io/npm/v/@markitdownjs/json?label=)](https://www.npmjs.com/package/@markitdownjs/json) | JSON converter |
| [`@markitdownjs/xml`](./packages/xml) | [![npm](https://img.shields.io/npm/v/@markitdownjs/xml?label=)](https://www.npmjs.com/package/@markitdownjs/xml) | XML converter |
| [`@markitdownjs/epub`](./packages/epub) | [![npm](https://img.shields.io/npm/v/@markitdownjs/epub?label=)](https://www.npmjs.com/package/@markitdownjs/epub) | EPUB converter |
| [`@markitdownjs/image-ocr`](./packages/image-ocr) | [![npm](https://img.shields.io/npm/v/@markitdownjs/image-ocr?label=)](https://www.npmjs.com/package/@markitdownjs/image-ocr) | Image OCR (tesseract.js) |
| [`@markitdownjs/audio`](./packages/audio) | [![npm](https://img.shields.io/npm/v/@markitdownjs/audio?label=)](https://www.npmjs.com/package/@markitdownjs/audio) | Audio metadata extraction |
| [`@markitdownjs/archive`](./packages/archive) | [![npm](https://img.shields.io/npm/v/@markitdownjs/archive?label=)](https://www.npmjs.com/package/@markitdownjs/archive) | ZIP archive converter |
| [`@markitdownjs/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@markitdownjs/react?label=)](https://www.npmjs.com/package/@markitdownjs/react) | React hooks and components |
| [`@markitdownjs/next`](./packages/next) | [![npm](https://img.shields.io/npm/v/@markitdownjs/next?label=)](https://www.npmjs.com/package/@markitdownjs/next) | Next.js Route Handlers, Server Actions |
| [`@markitdownjs/cli`](./packages/cli) | [![npm](https://img.shields.io/npm/v/@markitdownjs/cli?label=)](https://www.npmjs.com/package/@markitdownjs/cli) | CLI: convert, watch, batch, serve |
| [`@markitdownjs/api`](./packages/api) | [![npm](https://img.shields.io/npm/v/@markitdownjs/api?label=)](https://www.npmjs.com/package/@markitdownjs/api) | Hono HTTP API server |

---

## Supported Formats

| Format | Extensions | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Text, headings, page breaks |
| Word | `.docx` | Headings, tables, lists, inline formatting |
| PowerPoint | `.pptx` | Slides, titles, speaker notes |
| Excel | `.xlsx` | Multi-sheet, table structure |
| HTML | `.html`, `.htm` | Readability extraction |
| CSV / TSV | `.csv`, `.tsv` | Header detection |
| JSON | `.json` | Structured tables and code blocks |
| XML | `.xml` | Element hierarchy |
| EPUB | `.epub` | Chapters, metadata |
| Images | `.png`, `.jpg`, `.webp`, `.gif`, `.tiff` | OCR via tesseract.js |
| Audio | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac` | Metadata extraction |
| Archives | `.zip` | Per-file extraction with nested converters |
| Text / Markdown | `.txt`, `.md` | Passthrough |

---

## Pipeline

```
Source File
    │
    ▼
Format Detection
    │
    ▼
Converter (PDF / DOCX / HTML / ...)
    │
    ▼
Unified AST (DocumentNode)
    │
    ├──▶ MarkdownRenderer   → string
    ├──▶ HtmlRenderer       → string
    ├──▶ JsonRenderer       → object
    ├──▶ PlaintextRenderer  → string
    │
    ▼
Chunker (heading / page / token / semantic)
    │
    ▼
Chunks [ { chunkId, content, headingPath, pageNumber, tokenCount } ]
```

---

## Chunking for RAG

```typescript
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";
import { Chunker, HeadingChunkStrategy } from "@markitdownjs/chunking";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

const result = await parser.convert({ source: pdfBuffer, mimeType: "application/pdf" });

const chunker = new Chunker({ strategy: new HeadingChunkStrategy({ maxTokens: 512 }) });
const chunks = chunker.chunk(result.ast, { sourceFile: "report.pdf" });

// Each chunk is ready for OpenAI, Anthropic, LangChain, LlamaIndex, or a vector DB
for (const chunk of chunks) {
  console.log(chunk.headingPath);   // ["Introduction", "Background"]
  console.log(chunk.tokenCount);    // 487
  console.log(chunk.content);       // clean text
}
```

---

## React

```tsx
import { useDocumentParser } from "@markitdownjs/react";

function UploadPage() {
  const { convert, result, loading, error } = useDocumentParser();

  return (
    <>
      <input type="file" onChange={(e) => convert(e.target.files![0])} />
      {loading && <p>Converting...</p>}
      {error && <p>{error.message}</p>}
      {result && <pre>{result.markdown}</pre>}
    </>
  );
}
```

---

## Next.js

```typescript
// app/api/convert/route.ts
import { createConvertRouteHandler } from "@markitdownjs/next";
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

export const POST = createConvertRouteHandler({ parser });
```

---

## CLI

```bash
npm install -g @markitdownjs/cli

markitdownjs convert report.pdf
markitdownjs convert report.pdf --output report.md --format markdown
markitdownjs batch ./docs --output ./output
markitdownjs watch ./inbox --output ./processed
markitdownjs serve --port 3000
```

---

## Custom Converter

```typescript
import type { Converter, ConversionInput, DocumentNode } from "@markitdownjs/shared";

class MyConverter implements Converter {
  canHandle(input: ConversionInput): boolean {
    return input.mimeType === "application/x-myformat";
  }

  async convert(input: ConversionInput): Promise<DocumentNode> {
    // parse input.source → return DocumentNode AST
  }
}

parser.registerConverter(new MyConverter());
```

---

## Development

```bash
git clone https://github.com/instax-dutta/MarkItDownJS.git
cd MarkItDownJS
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all 20 packages |
| `pnpm test` | Run all tests |
| `pnpm test:ci` | Tests with coverage |
| `pnpm lint` | ESLint across all packages |
| `pnpm format` | Prettier formatting |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm changeset` | Create a release changeset |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All PRs welcome.

For security issues, see [SECURITY.md](./SECURITY.md) — do not open public issues for vulnerabilities.

## License

[MIT](./LICENSE)
