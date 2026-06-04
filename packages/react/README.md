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

```tsx
import { useDocumentParser } from "@markitdownjs/react";

function UploadPage() {
  const { convert, result, loading, error } = useDocumentParser();

  return (
    <input
      type="file"
      onChange={(e) => convert(e.target.files![0])}
    />
  );
}
```

## API

### `useDocumentParser(options?)`

Returns `{ convert, result, loading, error, reset }`.

### `useMarkdownConversion(source, mimeType)`

Returns `{ markdown, loading, error }` — converts a source directly to a Markdown string.

### `useDocumentChunks(source, mimeType, options?)`

Returns `{ chunks, loading, error }` — splits the converted document into chunked nodes, useful for RAG pipelines.

### `DocumentProvider`

Context provider. Wrap your app to share a single `MarkItDown` instance and registered converters across all hooks.

```tsx
import { DocumentProvider } from "@markitdownjs/react";
import { JsonConverter } from "@markitdownjs/json";

<DocumentProvider converters={[new JsonConverter()]}>
  <App />
</DocumentProvider>
```

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
