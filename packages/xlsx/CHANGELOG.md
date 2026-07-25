# @markitdownjs/xlsx

## 0.3.0

### Minor Changes

- Phase 1-2: Foundation hardening + RAG-first features

  New packages:
  - @markitdownjs/optimizer — semantic noise collapsing with 6 built-in rules
  - @markitdownjs/pack — standardized portable output format with pack/unpack

  Shared/AST:
  - Add ConversionWarning type and warnings mechanism to ConversionResult
  - Add CalloutNode (note/warning/tip/caution) to document AST

  Converters:
  - PDF: multi-column layout detection, table extraction, scanned PDF warnings
  - DOCX: inline image extraction from w:drawing elements, includeComments option
  - XLSX: formula detection via f elements with cached value extraction
  - HTML: strip nav/header/footer/SVG, decorative image detection
  - EPUB: NCX chapter boundary detection, SectionNode wrapping, blank page filtering

  Chunking:
  - Model-aware tokenizer registry (FastBPE, Cl100k, O200k)
  - Heading strategy overlap support with trailing text extraction
  - Section type classification (narrative/table/code/list/callout/mixed)
  - Deduplication fingerprinting with content + structure hashes

### Patch Changes

- Updated dependencies
  - @markitdownjs/shared@0.3.0
  - @markitdownjs/ast@0.1.3

## 0.2.0

### Minor Changes

- Production readiness: DX improvements, zip bomb protection, and output quality fixes
  - `@markitdownjs/shared`: add `strictCanConvert`, `isZipMagic`, `checkZipBombRisk` utilities; add `pageBreakMarker`, `injectFrontmatter`, `headingSizeRatios` to `ConversionOptions`
  - `@markitdownjs/core`: add `MarkItDown.create({ preset: 'all' })` async factory for auto-registration of all installed converters
  - `@markitdownjs/docx`: fix `****` artifacts via `mergeInlineRuns()`; add namespace-agnostic OOXML tag matching
  - `@markitdownjs/xlsx`: prune blank rows/columns; auto-generate column headers; CRC32 validation
  - `@markitdownjs/pdf`: configurable heading ratio thresholds, page break marker, YAML frontmatter injection, PDF metadata extraction
  - `@markitdownjs/html`: eliminate blank line bloat from empty `<p>` containers
  - `@markitdownjs/pptx`, `@markitdownjs/epub`, `@markitdownjs/archive`: zip bomb protection (50 MB decompressed limit)

### Patch Changes

- Updated dependencies
  - @markitdownjs/shared@0.2.0
  - @markitdownjs/ast@0.1.2

## 0.1.1

### Patch Changes

- Add README, description, and license to all packages for npm registry pages
- Updated dependencies
  - @markitdownjs/ast@0.1.1
  - @markitdownjs/shared@0.1.1
