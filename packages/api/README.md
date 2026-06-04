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

startServer({ port: 3000 });
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

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/convert` | Convert a single file (`multipart/form-data`, field: `file`) |
| `POST` | `/batch` | Convert multiple files in one request |
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |
| `GET` | `/formats` | List registered converter MIME types |

## Docker

```bash
npx @markitdownjs/cli serve --port 3000
```

## API

| Export | Description |
|--------|-------------|
| `createApp(opts)` | Returns a configured Hono app instance |
| `startServer(opts)` | Creates the app and starts a Node.js HTTP listener |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
