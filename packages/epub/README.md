# @markitdownjs/epub

[![npm](https://img.shields.io/npm/v/@markitdownjs/epub)](https://www.npmjs.com/package/@markitdownjs/epub)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

EPUB to AST converter for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Extracts chapters, headings, paragraphs, and metadata from EPUB ebooks into structured document nodes.

## Install

```bash
npm install @markitdownjs/epub @markitdownjs/core
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { EpubConverter } from "@markitdownjs/epub";

const parser = new MarkItDown();
parser.registerConverter(new EpubConverter());

const result = await parser.convert({ source: epubBuffer, mimeType: "application/epub+zip" });
```

## API

### `EpubConverter`

Implements the `IConverter` interface from `@markitdownjs/core`.

| Method | Description |
|--------|-------------|
| `convert(input)` | Extracts chapters and metadata from an EPUB buffer |
| `canHandle(mimeType)` | Returns `true` for `application/epub+zip` |

Extracted content includes: book metadata (title, author, language), chapter structure, headings, paragraphs, and inline formatting.

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
