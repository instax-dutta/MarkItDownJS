# @markitdownjs/shared

[![npm](https://img.shields.io/npm/v/@markitdownjs/shared)](https://www.npmjs.com/package/@markitdownjs/shared)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Internal package providing base types, AST node definitions, error classes, MIME type utilities, and DOM polyfills shared across all MarkItDownJS packages.

> **Note:** This is an internal package. Most users should install [`@markitdownjs/core`](../core) instead.

## Install

```bash
npm install @markitdownjs/shared
```

## Key Exports

### AST Node Types

| Export | Description |
|---|---|
| `DocumentNode` | Root node of the AST |
| `HeadingNode` | Heading element (h1–h6) |
| `ParagraphNode` | Block of text |
| `TableNode` | Table with headers and rows |
| `ImageNode` | Image with alt text and src |
| `CodeNode` | Inline or fenced code block |
| `ListNode` | Ordered or unordered list |
| `SectionNode` | Logical document section |

### Pipeline Types

| Export | Description |
|---|---|
| `ConversionResult` | Output of a converter: `{ markdown, ast, metadata }` |
| `ConversionInput` | Input to a converter: `{ source, mimeType, options? }` |

### Errors

| Export | Description |
|---|---|
| `MarkItDownError` | Base error class for all MarkItDownJS errors |

### Utilities

| Export | Description |
|---|---|
| `MimeTypeUtils` | MIME type detection, normalization, and extension mapping |

## Usage

```ts
import {
  DocumentNode,
  ConversionResult,
  MarkItDownError,
  MimeTypeUtils,
} from "@markitdownjs/shared";

const mime = MimeTypeUtils.fromExtension("pdf"); // "application/pdf"
```

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
