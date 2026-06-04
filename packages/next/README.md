# @markitdownjs/next

[![npm](https://img.shields.io/npm/v/@markitdownjs/next)](https://www.npmjs.com/package/@markitdownjs/next)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Next.js integration for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Provides Server Actions, Route Handlers, and streaming upload support.

**Peer dependency:** `next >= 14.0.0`

## Install

```bash
npm install @markitdownjs/next @markitdownjs/core
```

## Usage

### Route Handler (App Router)

```ts
// app/api/convert/route.ts
import { createConvertRouteHandler } from "@markitdownjs/next";
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

export const POST = createConvertRouteHandler({ parser });
```

### Server Action

```ts
"use server";
import { createConvertServerAction } from "@markitdownjs/next";
import { MarkItDown } from "@markitdownjs/core";

const parser = new MarkItDown();
export const convertDocument = createConvertServerAction({ parser });
```

### Upload Handler

```ts
import { createUploadHandler } from "@markitdownjs/next";
export const POST = createUploadHandler({ parser, maxSizeMb: 20 });
```

## API

| Export | Description |
|--------|-------------|
| `createConvertRouteHandler(opts)` | Returns a Next.js `POST` handler for `multipart/form-data` uploads |
| `createConvertServerAction(opts)` | Returns a Server Action accepting a `File` or `FormData` |
| `createUploadHandler(opts)` | Returns a handler with size limits and streaming support |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
