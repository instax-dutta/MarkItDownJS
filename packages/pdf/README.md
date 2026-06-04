# @markitdownjs/pdf

[![npm](https://img.shields.io/npm/v/@markitdownjs/pdf)](https://www.npmjs.com/package/@markitdownjs/pdf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PDF to AST converter for MarkItDownJS, powered by `pdfjs-dist`. Extracts text content, document structure, metadata, and page information.

## Install

```bash
npm install @markitdownjs/pdf
```

`pdfjs-dist` is a peer dependency and will be installed automatically.

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

const result = await parser.convert({ source: pdfBuffer, mimeType: "application/pdf" });
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `PdfConverter` | Converter plugin — register with `MarkItDown` |

## What Gets Extracted

- Text content with paragraph and heading detection
- Page boundaries (preserved as `pageNumber` in AST nodes)
- Document metadata: title, author, creation date, subject
- Multi-column layout heuristics

## Options

```ts
parser.registerConverter(new PdfConverter({
  extractMetadata: true,
  preservePageBreaks: true,
}));
```

## Accepted MIME Types

- `application/pdf`

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
