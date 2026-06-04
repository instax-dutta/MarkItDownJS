# @markitdownjs/chunking

[![npm](https://img.shields.io/npm/v/@markitdownjs/chunking)](https://www.npmjs.com/package/@markitdownjs/chunking)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

First-class document chunking for RAG pipelines. Splits a `DocumentNode` AST into semantic chunks with rich metadata — heading path, page number, token count, and chunk ID.

## Install

```bash
npm install @markitdownjs/chunking
```

## Usage

```ts
import { Chunker, HeadingChunkStrategy } from "@markitdownjs/chunking";

const chunker = new Chunker({ strategy: new HeadingChunkStrategy({ maxTokens: 512 }) });
const chunks = chunker.chunk(documentNode, { sourceFile: "report.pdf" });
```

## Chunk Schema

```ts
interface Chunk {
  chunkId: string;
  sourceFile: string;
  pageNumber: number | null;
  headingPath: string[];
  tokenCount: number;
  metadata: Record<string, unknown>;
  content: string;
}
```

## Strategies

| Export | Splits on |
|---|---|
| `HeadingChunkStrategy` | Document headings (h1–h6), with `maxTokens` overflow splitting |
| `PageChunkStrategy` | Page boundaries extracted from the AST |
| `TokenChunkStrategy` | Fixed token window with configurable overlap |
| `SemanticChunkStrategy` | Sentence-boundary aware splits using embedding similarity |

```ts
import { Chunker, TokenChunkStrategy } from "@markitdownjs/chunking";

const chunker = new Chunker({
  strategy: new TokenChunkStrategy({ maxTokens: 256, overlap: 32 }),
});
```

## Strategy Options

```ts
new HeadingChunkStrategy({
  maxTokens: 512,        // split oversized sections further
  minTokens: 50,         // merge sections below threshold
  includeHeadingPath: true,
});
```

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
