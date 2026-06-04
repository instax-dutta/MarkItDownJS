# @markitdownjs/archive

[![npm](https://img.shields.io/npm/v/@markitdownjs/archive)](https://www.npmjs.com/package/@markitdownjs/archive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ZIP/archive converter for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Extracts and converts files inside ZIP archives, returning a document node per contained file.

## Install

```bash
npm install @markitdownjs/archive @markitdownjs/core
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { ArchiveConverter } from "@markitdownjs/archive";

const parser = new MarkItDown();
parser.registerConverter(new ArchiveConverter());

const result = await parser.convert({ source: zipBuffer, mimeType: "application/zip" });
```

Each file inside the archive is converted individually. The output document contains one child node per extracted file, with `filename` and `mimeType` preserved in node metadata.

## API

### `ArchiveConverter`

Implements the `IConverter` interface from `@markitdownjs/core`.

| Method | Description |
|--------|-------------|
| `convert(input)` | Extracts archive entries and converts each to a document node |
| `canHandle(mimeType)` | Returns `true` for `application/zip` and `application/x-zip-compressed` |

> Nested converters are resolved from the `MarkItDown` instance registered at construction time. Register all required format converters before processing archives.

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
