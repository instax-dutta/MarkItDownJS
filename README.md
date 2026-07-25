# MarkItDownJS

**Universal document-to-Markdown conversion engine for TypeScript.**  
Transform PDFs, DOCX, PPTX, XLSX, HTML, EPUB, CSV, JSON, XML, images, audio, and archives into structured, AI-ready data. AST-first architecture. Zero Python. **24 packages, one pipeline.**

[![CI](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/ci.yml/badge.svg)](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/ci.yml)
[![CodeQL](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/codeql.yml/badge.svg)](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/codeql.yml)
[![Dependency Review](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/instax-dutta/MarkItDownJS/actions/workflows/dependency-review.yml)
[![npm (core)](https://img.shields.io/npm/v/@markitdownjs/core?color=cb3837&label=core)](https://www.npmjs.com/package/@markitdownjs/core)
[![npm (all)](https://img.shields.io/npm/v/@markitdownjs/all?color=cb3837&label=all)](https://www.npmjs.com/package/@markitdownjs/all)
[![npm downloads](https://img.shields.io/npm/dm/@markitdownjs/core?color=cb3837&label=downloads)](https://www.npmjs.com/package/@markitdownjs/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@markitdownjs/core?label=core%20size)](https://bundlephobia.com/package/@markitdownjs/core)
[![GitHub stars](https://img.shields.io/github/stars/instax-dutta/MarkItDownJS?style=flat&color=gold)](https://github.com/instax-dutta/MarkItDownJS/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/instax-dutta/MarkItDownJS?style=flat)](https://github.com/instax-dutta/MarkItDownJS/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GitHub Issues](https://img.shields.io/github/issues/instax-dutta/MarkItDownJS)](https://github.com/instax-dutta/MarkItDownJS/issues)
[![GitHub Discussions](https://img.shields.io/badge/chat-discussions-blue)](https://github.com/instax-dutta/MarkItDownJS/discussions)

---

## Quick Start

```bash
npm install @markitdownjs/markitdownjs
```

```typescript
import { createMarkItDown } from "@markitdownjs/markitdownjs";

// Create a fully-configured instance with all converters + chunker
const md = createMarkItDown();

// Convert a file — auto-detects format by extension
const result = await md.convert("report.pdf");
console.log(result.markdown);

// Works with buffers too — auto-detects by magic bytes
const result2 = await md.convert(pdfBuffer);
console.log(result2.markdown);
```

### Just the core?

```bash
npm install @markitdownjs/core @markitdownjs/pdf @markitdownjs/docx
```

```typescript
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";
import { DocxConverter } from "@markitdownjs/docx";

const md = new MarkItDown();
md.registerConverter(new PdfConverter());
md.registerConverter(new DocxConverter());

const result = await md.convert("report.docx");
console.log(result.markdown);
```

---

## Why MarkItDownJS?

| Feature | MarkItDownJS | markitdown-ts | markitdown-js | markit-ai |
|---------|-------------|---------------|---------------|-----------|
| **Documents** | PDF, DOCX, PPTX, XLSX | PDF, DOCX | PDF, DOCX, PPTX, XLSX | PDF, DOCX, PPTX, XLSX |
| **Web formats** | HTML, XML, CSV, JSON, EPUB | — | — | HTML, EPUB |
| **Media** | Images (OCR), Audio (transcription) | — | — | Images (LLM), Audio (LLM) |
| **Archives** | ZIP extract + per-file convert | — | — | — |
| **AST output** | ✅ Full `DocumentNode` tree | — | — | — |
| **Chunking for RAG** | ✅ 4 strategies (heading, page, semantic, fixed) | — | — | — |
| **Output formats** | Markdown, HTML, JSON, plain text | Markdown | Markdown | Markdown |
| **Renderer plugins** | ✅ Swappable renderers | — | — | — |
| **React / Next.js** | ✅ Hooks, components, API routes | — | — | — |
| **CLI** | ✅ Convert, watch, batch, serve | ✅ Basic | — | ✅ Basic |
| **HTTP API** | ✅ Hono server | — | — | — |
| **Packaging** | 20 modular packages | 1 package | 1 package | 1 package |
| **Language** | TypeScript (strict) | TypeScript | JavaScript | TypeScript |
| **Runtime** | Node.js, Bun, Deno, Browser | Node.js | Node.js | Node.js |
| **License** | MIT | MIT | MIT | MIT |

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@markitdownjs/markitdownjs`](./packages/markitdownjs) | [![npm](https://img.shields.io/npm/v/@markitdownjs/markitdownjs?label=)](https://www.npmjs.com/package/@markitdownjs/markitdownjs) | **Scoped all-in-one** — single `npm install` entry point |
| [`@markitdownjs/all`](./packages/all) | [![npm](https://img.shields.io/npm/v/@markitdownjs/all?label=)](https://www.npmjs.com/package/@markitdownjs/all) | Umbrella — all packages + `createMarkItDown()` preset |
| [`@markitdownjs/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@markitdownjs/core?label=)](https://www.npmjs.com/package/@markitdownjs/core) | `MarkItDown` class, pipeline, registry, renderer |
| [`@markitdownjs/shared`](./packages/shared) | [![npm](https://img.shields.io/npm/v/@markitdownjs/shared?label=)](https://www.npmjs.com/package/@markitdownjs/shared) | AST types, MIME utils, errors, base interfaces |
| [`@markitdownjs/ast`](./packages/ast) | [![npm](https://img.shields.io/npm/v/@markitdownjs/ast?label=)](https://www.npmjs.com/package/@markitdownjs/ast) | Renderers: Markdown, HTML, JSON, plain text |
| [`@markitdownjs/chunking`](./packages/chunking) | [![npm](https://img.shields.io/npm/v/@markitdownjs/chunking?label=)](https://www.npmjs.com/package/@markitdownjs/chunking) | 4 chunking strategies for RAG |
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
| [`@markitdownjs/pack`](./packages/pack) | [![npm](https://img.shields.io/npm/v/@markitdownjs/pack?label=)](https://www.npmjs.com/package/@markitdownjs/pack) | Portable bundle pack/unpack |
| [`@markitdownjs/optimizer`](./packages/optimizer) | [![npm](https://img.shields.io/npm/v/@markitdownjs/optimizer?label=)](https://www.npmjs.com/package/@markitdownjs/optimizer) | Markdown optimization rules |
| [`@markitdownjs/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@markitdownjs/react?label=)](https://www.npmjs.com/package/@markitdownjs/react) | React hooks and components |
| [`@markitdownjs/next`](./packages/next) | [![npm](https://img.shields.io/npm/v/@markitdownjs/next?label=)](https://www.npmjs.com/package/@markitdownjs/next) | Next.js Route Handlers, Server Actions |
| [`@markitdownjs/cli`](./packages/cli) | [![npm](https://img.shields.io/npm/v/@markitdownjs/cli?label=)](https://www.npmjs.com/package/@markitdownjs/cli) | CLI: convert, watch, batch, serve |
| [`@markitdownjs/api`](./packages/api) | [![npm](https://img.shields.io/npm/v/@markitdownjs/api?label=)](https://www.npmjs.com/package/@markitdownjs/api) | Hono HTTP API server |

---

## Supported Formats

| Format | Extensions | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Text, headings, page breaks, frontmatter |
| Word | `.docx` | Headings, tables, lists, inline formatting |
| PowerPoint | `.pptx` | Slides, titles, speaker notes |
| Excel | `.xlsx` | Multi-sheet, table structure |
| HTML | `.html`, `.htm` | Readability extraction |
| CSV / TSV | `.csv`, `.tsv` | Header detection |
| JSON | `.json` | Structured tables and code blocks |
| XML | `.xml` | Element hierarchy |
| EPUB | `.epub` | Chapters, metadata |
| Images | `.png`, `.jpg`, `.webp`, `.gif`, `.bmp`, `.tiff` | OCR via tesseract.js |
| Audio | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac` | Metadata extraction |
| Archives | `.zip` | Per-file extraction with nested converters |
| Text / Markdown | `.txt`, `.md` | Passthrough |

---

## Chunking for RAG

MarkItDownJS has **built-in document chunking** for RAG pipelines — no need for a secondary chunking library.

```typescript
import { MarkItDown } from "@markitdownjs/core";
import { DocumentChunker, HeadingChunkingStrategy } from "@markitdownjs/chunking";
import { PdfConverter } from "@markitdownjs/pdf";

const md = new MarkItDown();
md.registerConverter(new PdfConverter());

// Register the chunker — auto-runs after convert() when chunking options are set
md.registerChunker(new DocumentChunker());

const result = await md.convert({
  data: pdfBuffer,
  mimeType: "application/pdf",
  options: {
    chunking: {
      enabled: true,
      strategy: "heading",
      maxTokens: 512,
      headingDepth: 3,
    },
  },
});

// Chunks are automatically populated on the result
for (const chunk of result.chunks ?? []) {
  console.log(chunk.metadata.headingPath); // ["Introduction", "Background"]
  console.log(chunk.metadata.tokenCount);   // 487
  console.log(chunk.content);               // Clean chunk text — ready for embedding
}
```

### Available strategies

| Strategy | Class | When to use |
|----------|-------|-------------|
| Heading | `HeadingChunkingStrategy` | Structured documents with sections |
| Page | `PageChunkingStrategy` | Page-numbered documents (PDFs) |
| Semantic | `SemanticChunkingStrategy` | Natural topic boundaries |
| Fixed | `FixedChunkingStrategy` | Uniform token windows |

Chunks come with rich metadata (`headingPath`, `page`, `tokenCount`, `contentType`) — ideal for vector databases, LangChain, LlamaIndex, or direct embedding API calls.

---

## React

```tsx
import { useDocumentParser, DocumentDropzone } from "@markitdownjs/react";

function UploadPage() {
  const { result } = useDocumentParser();

  return (
    <div>
      <DocumentDropzone onConvert={(r) => console.log(r.markdown)} />
      {result && <pre>{result.markdown}</pre>}
    </div>
  );
}
```

---

## Next.js

```typescript
// app/api/convert/route.ts
import { createConvertRoute } from "@markitdownjs/next";

export const POST = createConvertRoute();
```

Or with a custom parser:

```typescript
import { createConvertRoute } from "@markitdownjs/next";
import { createMarkItDown } from "@markitdownjs/markitdownjs";

export const POST = createConvertRoute({ parser: createMarkItDown() });
```

---

## CLI

```bash
npm install -g @markitdownjs/cli

# Convert a single file
markitdownjs convert report.pdf

# Convert with output path
markitdownjs convert report.pdf --output report.md --format markdown

# Batch convert a directory
markitdownjs batch ./docs --output ./output

# Watch directory for new files
markitdownjs watch ./inbox --output ./processed

# Start HTTP API server
markitdownjs serve --port 3000
```

---

## Architecture

```
Source File
    │
    ▼
Format Detection (magic bytes / extension / MIME)
    │
    ▼
Converter (PDF / DOCX / HTML / CSV / JSON / XML / EPUB / ...)
    │
    ▼
Unified AST (DocumentNode)
    │
    ├──▶ MarkdownRenderer   → .md string
    ├──▶ HtmlRenderer       → HTML string
    ├──▶ JsonRenderer       → JSON string
    ├──▶ PlaintextRenderer  → plain text string
    │
    ▼
Chunker (heading / page / semantic / fixed)
    │
    ▼
Chunks [ { chunkId, content, headingPath, pageNumber, tokenCount, contentType } ]
```

### Key design principles

- **AST-first** — every converter produces a structured `DocumentNode` AST, not raw text. Renderers are swappable.
- **Plugin-based** — `registerConverter()`, `registerRenderer()`, `registerChunker()`. Core never imports converter packages directly.
- **Zero Python** — pure TypeScript, runs natively in Node.js, Bun, Deno, Electron, and browsers (where supported).
- **20 packages, one pipeline** — format-specific packages, a shared AST, and a core orchestrator. Install only what you need.

---

## Custom Converter

```typescript
import type { ConversionInput, ConversionResult, Converter } from "@markitdownjs/shared";

class MyFormatConverter implements Converter {
  readonly id = "myformat";
  readonly supportedMimeTypes = ["application/x-myformat"];
  readonly supportedExtensions = [".myf"];

  async canConvert(input: ConversionInput): Promise<boolean> {
    // Check magic bytes
    return input.fileName?.endsWith(".myf") ?? false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    // Parse input.data → return ConversionResult
    throw new Error("Not implemented");
  }
}

const md = new MarkItDown();
md.registerConverter(new MyFormatConverter());
```

---

## Development

```bash
git clone https://github.com/instax-dutta/MarkItDownJS.git
cd MarkItDownJS
pnpm install
pnpm build
pnpm test
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all 24 packages (Turborepo) |
| `pnpm test` | Run all tests |
| `pnpm test:ci` | Tests with coverage |
| `pnpm lint` | ESLint across all packages |
| `pnpm format` | Prettier formatting |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm changeset` | Create a release changeset |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All PRs welcome.

For security issues, see [SECURITY.md](./SECURITY.md) — please do not open public issues for vulnerabilities.

---

## License

[MIT](./LICENSE)
