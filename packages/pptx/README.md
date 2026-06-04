# @markitdownjs/pptx

[![npm](https://img.shields.io/npm/v/@markitdownjs/pptx)](https://www.npmjs.com/package/@markitdownjs/pptx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PowerPoint (PPTX) to AST converter for MarkItDownJS. Extracts slide content, speaker notes, titles, and slide order from `.pptx` files.

## Install

```bash
npm install @markitdownjs/pptx
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { PptxConverter } from "@markitdownjs/pptx";

const parser = new MarkItDown();
parser.registerConverter(new PptxConverter());

const result = await parser.convert({
  source: pptxBuffer,
  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
});
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `PptxConverter` | Converter plugin — register with `MarkItDown` |

## What Gets Extracted

- Slide titles (rendered as headings)
- Body text and bullet points per slide
- Speaker notes (appended as blockquotes or omitted via options)
- Slide order preserved in AST metadata

## Options

```ts
parser.registerConverter(new PptxConverter({
  includeSpeakerNotes: true,
  slideNumbering: true,
}));
```

## Accepted MIME Types

- `application/vnd.openxmlformats-officedocument.presentationml.presentation`

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
