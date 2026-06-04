# @markitdownjs/docx

[![npm](https://img.shields.io/npm/v/@markitdownjs/docx)](https://www.npmjs.com/package/@markitdownjs/docx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

DOCX (Word) to AST converter for MarkItDownJS. Parses headings, paragraphs, lists, tables, inline formatting, and document metadata from `.docx` files.

## Install

```bash
npm install @markitdownjs/docx
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { DocxConverter } from "@markitdownjs/docx";

const parser = new MarkItDown();
parser.registerConverter(new DocxConverter());

const result = await parser.convert({
  source: docxBuffer,
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `DocxConverter` | Converter plugin — register with `MarkItDown` |

## What Gets Extracted

- Headings (mapped from Word heading styles h1–h6)
- Paragraphs with bold, italic, underline, and strikethrough inline formatting
- Ordered and unordered lists (including nested)
- Tables with header row detection
- Document core properties: title, author, description, created/modified dates

## Accepted MIME Types

- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/msword` (`.doc` files are not supported — convert to `.docx` first)

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
