# @markitdownjs/csv

[![npm](https://img.shields.io/npm/v/@markitdownjs/csv)](https://www.npmjs.com/package/@markitdownjs/csv)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CSV to AST converter for MarkItDownJS. Parses CSV files into structured `TableNode` AST nodes with automatic header detection.

## Install

```bash
npm install @markitdownjs/csv
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { CsvConverter } from "@markitdownjs/csv";

const parser = new MarkItDown();
parser.registerConverter(new CsvConverter());

const result = await parser.convert({ source: csvString, mimeType: "text/csv" });
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `CsvConverter` | Converter plugin — register with `MarkItDown` |

## What Gets Extracted

- Rows parsed into a single `TableNode`
- First row treated as headers by default (heuristic-based detection available)
- Handles quoted fields, escaped commas, and multiline cell values
- Configurable delimiter — works with TSV and other separated-value formats

## Options

```ts
parser.registerConverter(new CsvConverter({
  delimiter: ",",
  firstRowAsHeader: true,
  detectHeader: false, // set true to use heuristics instead of firstRowAsHeader
}));
```

## Accepted MIME Types

- `text/csv`
- `text/tab-separated-values`

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
