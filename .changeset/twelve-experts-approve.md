---
"@markitdownjs/shared": minor
"@markitdownjs/core": minor
---

Add `DocumentRenderer` and `Chunker` interfaces to shared types for pluggable rendering and RAG chunking.

Add `registerConverter()`, `registerRenderer()`, and `registerChunker()` convenience methods to the `MarkItDown` class. The `convert()` method now auto-chunks results when a chunker is registered and `chunking` options are provided.

Add `detectMimeTypeFromBuffer()` utility that chains magic-byte detection with extension-based fallback.

Update `normalizeInput()` to extract `fileName` from string paths and auto-detect MIME from `Uint8Array` buffer magic bytes.
