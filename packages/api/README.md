# @markitdownjs/api

[![npm](https://img.shields.io/npm/v/@markitdownjs/api)](https://www.npmjs.com/package/@markitdownjs/api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Hono-based HTTP API server for document conversion. Part of [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Deploy as a standalone microservice or embed in any Node.js app.

## Install

```bash
npm install @markitdownjs/api @markitdownjs/core
```

## Usage

```ts
import { startServer } from "@markitdownjs/api";
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

startServer({ parser, port: 3000 });
```

### Embed in an existing Hono or Node app

```ts
import { createApp } from "@markitdownjs/api";
import { MarkItDown } from "@markitdownjs/core";
import { PdfConverter } from "@markitdownjs/pdf";

const parser = new MarkItDown();
parser.registerConverter(new PdfConverter());

const app = createApp({ parser });
// Mount `app` into your existing Hono/Express instance
```

Without a parser, `/convert` returns a clear configuration error rather than an
empty-registry failure.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/convert` | Convert a single file (`multipart/form-data`, field: `file`) |
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |
| `GET` | `/formats` | List supported extensions and MIME types |

## API

| Export | Description |
|--------|-------------|
| `createApp({ parser? })` | Returns a configured Hono app instance |
| `startServer({ parser?, port? })` | Creates the app and starts a Node.js HTTP listener |
| `rateLimit(options?)` | Rate-limiting middleware |
| `validateFileSize` | File-size validation middleware |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
