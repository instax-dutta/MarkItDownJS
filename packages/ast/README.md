# @markitdownjs/ast

[![npm](https://img.shields.io/npm/v/@markitdownjs/ast)](https://www.npmjs.com/package/@markitdownjs/ast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AST utilities and multi-format renderers for MarkItDownJS. Convert a `DocumentNode` AST to Markdown, HTML, plain text, or JSON.

## Install

```bash
npm install @markitdownjs/ast
```

## Usage

```ts
import { MarkdownRenderer, HtmlRenderer } from "@markitdownjs/ast";

const md = new MarkdownRenderer().render(documentNode);
const html = new HtmlRenderer().render(documentNode);
```

## Key Exports

### Renderers

| Export | Output format |
|---|---|
| `MarkdownRenderer` | GitHub-flavored Markdown |
| `HtmlRenderer` | Semantic HTML5 |
| `PlaintextRenderer` | Stripped plain text |
| `JsonRenderer` | Serialized AST as JSON |

All renderers implement the same interface:

```ts
interface Renderer {
  render(node: DocumentNode): string;
}
```

### Utilities

| Export | Description |
|---|---|
| `AstUtils` | Traverse, query, and transform `DocumentNode` trees |

```ts
import { AstUtils } from "@markitdownjs/ast";

const headings = AstUtils.selectAll(documentNode, "HeadingNode");
const text = AstUtils.extractText(documentNode);
```

## Renderer Options

```ts
const renderer = new HtmlRenderer({ includeIds: true, wrapInDocument: false });
const html = renderer.render(documentNode);
```

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
