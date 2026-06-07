# @markitdownjs/pdf

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
