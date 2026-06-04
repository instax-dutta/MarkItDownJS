# @markitdownjs/image-ocr

[![npm](https://img.shields.io/npm/v/@markitdownjs/image-ocr)](https://www.npmjs.com/package/@markitdownjs/image-ocr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Image OCR converter for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Extracts text from images using Tesseract.js.

## Install

```bash
npm install @markitdownjs/image-ocr @markitdownjs/core

# Peer dependency (optional — required at runtime)
npm install tesseract.js
```

> **Peer dependency:** `tesseract.js >= 5.0.0` must be installed separately. The converter will throw at runtime if it is missing.

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { OcrConverter } from "@markitdownjs/image-ocr";

const parser = new MarkItDown();
parser.registerConverter(new OcrConverter({ lang: "eng" }));

const result = await parser.convert({ source: imageBuffer, mimeType: "image/png" });
```

## API

### `OcrConverter`

Implements the `IConverter` interface from `@markitdownjs/core`.

**Constructor options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lang` | `string` | `"eng"` | Tesseract language code |
| `workerPath` | `string` | — | Custom path to Tesseract worker |

| Method | Description |
|--------|-------------|
| `convert(input)` | Runs OCR on the image buffer and returns extracted text as document nodes |
| `canHandle(mimeType)` | Returns `true` for `image/png`, `image/jpeg`, `image/webp`, `image/tiff` |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
