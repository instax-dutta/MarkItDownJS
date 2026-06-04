# @markitdownjs/html

[![npm](https://img.shields.io/npm/v/@markitdownjs/html)](https://www.npmjs.com/package/@markitdownjs/html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

HTML to AST converter for MarkItDownJS. Uses Mozilla Readability for main-content extraction — well-suited for web pages, blog posts, and documentation sites.

## Install

```bash
npm install @markitdownjs/html
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { HtmlConverter } from "@markitdownjs/html";

const parser = new MarkItDown();
parser.registerConverter(new HtmlConverter());

const result = await parser.convert({ source: htmlString, mimeType: "text/html" });
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `HtmlConverter` | Converter plugin — register with `MarkItDown` |

## What Gets Extracted

- Main article content via Mozilla Readability (strips nav, ads, footers)
- Headings, paragraphs, lists, tables, blockquotes, and code blocks
- `<img>` alt text and src preserved as `ImageNode`
- Page `<title>` and `<meta>` description captured as metadata

## Options

```ts
parser.registerConverter(new HtmlConverter({
  useReadability: true,   // set false to parse full document without extraction
  baseUrl: "https://example.com", // used to resolve relative image/link URLs
}));
```

## Accepted MIME Types

- `text/html`
- `application/xhtml+xml`

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
