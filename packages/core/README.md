# @markitdownjs/core

[![npm](https://img.shields.io/npm/v/@markitdownjs/core)](https://www.npmjs.com/package/@markitdownjs/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Core orchestration package for MarkItDownJS. Provides the plugin registry, document pipeline, and renderer — the central package most users install.

## Install

```bash
npm install @markitdownjs/core
```

Install converter packages separately as needed:

```bash
npm install @markitdownjs/pdf @markitdownjs/docx @markitdownjs/html
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

const result = await parser.convert({ data: fileBytes, mimeType: "application/pdf" });
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `MarkItDown` | Main entry point — register converters, run conversions |
| `MarkItDownOptions` | Configuration options for the `MarkItDown` constructor |
| `DefaultConverterRegistry` | Built-in registry for managing converter plugins |
| `DocumentPipeline` | Low-level pipeline for transforming `ConversionInput` → AST |
| `MarkdownRenderer` | Renders a `DocumentNode` AST to Markdown string |
| `MetadataExtractor` | Extracts title, author, dates, and other document metadata |
| `AssetManager` | Handles embedded asset resolution (images, attachments) |

## Options

```ts
const parser = new MarkItDown({ registry: myRegistry });

// Or auto-register all installed converter packages:
const all = await MarkItDown.create({ preset: "all" });
```

## Result Shape

```ts
interface ConversionResult {
  markdown: string;
  metadata: DocumentMetadata;
  assets: AssetInfo[];
  tables: TableData[];
  images: ImageInfo[];
  headings: HeadingInfo[];
  ast?: AnyNode;
  format: OutputFormat;
  converterId: string;
  stats: ConversionStats;
  chunks?: DocumentChunk[];
  warnings?: ConversionWarning[];
}
```

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
