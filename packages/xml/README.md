# @markitdownjs/xml

[![npm](https://img.shields.io/npm/v/@markitdownjs/xml)](https://www.npmjs.com/package/@markitdownjs/xml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

XML to AST converter for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Parses XML documents into structured document nodes, preserving element hierarchy.

## Install

```bash
npm install @markitdownjs/xml @markitdownjs/core
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { XmlConverter } from "@markitdownjs/xml";

const parser = new MarkItDown();
parser.registerConverter(new XmlConverter());

const result = await parser.convert({ source: xmlString, mimeType: "application/xml" });
```

## API

### `XmlConverter`

Implements the `IConverter` interface from `@markitdownjs/core`.

| Method | Description |
|--------|-------------|
| `convert(input)` | Parses XML into document AST nodes preserving element hierarchy |
| `canHandle(mimeType)` | Returns `true` for `application/xml` and `text/xml` |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
