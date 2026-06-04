# @markitdownjs/xlsx

[![npm](https://img.shields.io/npm/v/@markitdownjs/xlsx)](https://www.npmjs.com/package/@markitdownjs/xlsx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Excel (XLSX) to AST converter for MarkItDownJS. Converts spreadsheet sheets into structured `TableNode` AST nodes with headers and rows.

## Install

```bash
npm install @markitdownjs/xlsx
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { XlsxConverter } from "@markitdownjs/xlsx";

const parser = new MarkItDown();
parser.registerConverter(new XlsxConverter());

const result = await parser.convert({
  source: xlsxBuffer,
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
console.log(result.markdown);
```

## Key Exports

| Export | Description |
|---|---|
| `XlsxConverter` | Converter plugin — register with `MarkItDown` |

## What Gets Extracted

- Each sheet becomes a separate `TableNode` with the sheet name as a heading
- First row treated as the header row (configurable)
- Cell values normalized to strings; numbers and dates are formatted
- Empty rows and columns are skipped by default

## Options

```ts
parser.registerConverter(new XlsxConverter({
  firstRowAsHeader: true,
  skipEmptyRows: true,
  sheets: ["Sheet1", "Summary"], // process only specific sheets
}));
```

## Accepted MIME Types

- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.ms-excel`

---

Part of the [MarkItDownJS](https://github.com/markitdownjs/markitdownjs) monorepo.
