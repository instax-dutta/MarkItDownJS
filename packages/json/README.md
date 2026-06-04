# @markitdownjs/json

[![npm](https://img.shields.io/npm/v/@markitdownjs/json)](https://www.npmjs.com/package/@markitdownjs/json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

JSON to AST converter for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Converts JSON objects and arrays into structured document nodes — useful for ingesting API responses or config files.

## Install

```bash
npm install @markitdownjs/json @markitdownjs/core
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { JsonConverter } from "@markitdownjs/json";

const parser = new MarkItDown();
parser.registerConverter(new JsonConverter());

const result = await parser.convert({ source: jsonString, mimeType: "application/json" });
```

## API

### `JsonConverter`

Implements the `IConverter` interface from `@markitdownjs/core`.

| Method | Description |
|--------|-------------|
| `convert(input)` | Parses a JSON string or object into document AST nodes |
| `canHandle(mimeType)` | Returns `true` for `application/json` |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
