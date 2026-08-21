# @markitdownjs/next

[![npm](https://img.shields.io/npm/v/@markitdownjs/next)](https://www.npmjs.com/package/@markitdownjs/next)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Next.js integration for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Provides Server Actions, Route Handlers, and upload helpers.

**Peer dependency:** `next >= 14.0.0`

## Install

```bash
npm install @markitdownjs/next @markitdownjs/core
```

## Usage

Each conversion helper requires a configured `MarkItDown` parser. Pass one in explicitly — the helpers never construct an empty parser on their own.

### Route Handler factory (App Router)

```ts
// app/api/convert/route.ts
import { createConvertRoute } from "@markitdownjs/next";
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

export const POST = createConvertRoute({ parser });
```

### Direct route helpers

```ts
import { convertRoute, batchRoute, formatsRoute } from "@markitdownjs/next";

export async function POST(request: Request) {
  return convertRoute(request, parser);
}
```

### Server Action

```ts
"use server";
import { convertDocumentAction } from "@markitdownjs/next";

export async function convertDocument(formData: FormData) {
  return convertDocumentAction(formData, parser);
}
```

## API

| Export | Description |
|--------|-------------|
| `createConvertRoute({ parser, maxFileSize?, allowedTypes?, onConvert? })` | Returns a Next.js `POST` handler for `multipart/form-data` uploads |
| `convertRoute(request, parser?)` | Converts a single file; returns a clear error when `parser` is omitted |
| `batchRoute(request, parser?)` | Converts multiple files in one request |
| `formatsRoute()` | Lists supported extensions and MIME types |
| `convertDocumentAction(formData, parser?)` | Server Action converting a `FormData` file |
| `handleFileUpload`, `validateFile` | Upload validation helpers |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
