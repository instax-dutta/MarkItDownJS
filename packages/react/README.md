# @markitdownjs/react

[![npm](https://img.shields.io/npm/v/@markitdownjs/react)](https://www.npmjs.com/package/@markitdownjs/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

React hooks and components for document conversion in browser and React apps. Part of [MarkItDownJS](https://github.com/markitdownjs/markitdownjs).

**Peer dependency:** `react >= 18.0.0`

## Install

```bash
npm install @markitdownjs/react @markitdownjs/core
npm install react react-dom  # peer dependencies
```

## Usage

### Share a configured parser across your app

```tsx
import { MarkItDownProvider } from "@markitdownjs/react";
import { MarkItDown } from "@markitdownjs/core";
import { JsonConverter } from "@markitdownjs/json";

const parser = new MarkItDown();
parser.registerConverter(new JsonConverter());

<MarkItDownProvider parser={parser}>
  <App />
</MarkItDownProvider>;
```

### Hooks

```tsx
import { useDocumentParser } from "@markitdownjs/react";

function UploadPage() {
  const { convert, result, isConverting, error } = useDocumentParser(parser);

  return <input type="file" onChange={(e) => convert(e.target.files![0])} />;
}
```

Hooks accept an optional parser argument. When omitted, they create and cache a
single parser instance internally rather than constructing a new one per file.

## API

### `MarkItDownProvider`

Props: `{ children, parser?, converters? }`. Wrap your app to share a single
configured parser across hooks.

### `useMarkItDown()`

Returns `{ convert, convertToMarkdown, convertToJson }` backed by the provider's
parser.

### `useDocumentParser(parser?)`

Returns `{ convert, result, isConverting, error, progress, reset }`.

### `useMarkdownConversion(parser?)`

Returns `{ markdown, isConverting, error, convertToMarkdown, convertToJson }`.

### Components

`DocumentDropzone`, `DocumentPreview`, `MarkdownViewer`, `ConversionProgress`.

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
