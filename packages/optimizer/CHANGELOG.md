# @markitdownjs/optimizer

## 0.2.0

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
