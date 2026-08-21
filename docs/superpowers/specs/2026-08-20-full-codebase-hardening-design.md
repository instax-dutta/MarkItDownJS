# Full Codebase Hardening Design

**Date:** 2026-08-20

## Goal

Restore correctness across the MarkItDownJS monorepo by fixing confirmed conversion, chunking, integration, security, packaging, CI, testing, and documentation defects without introducing speculative features.

## Scope

This design covers the concrete issues found during the repository audit:

- Conversion input normalization and output-format behavior.
- Duplicate AST traversal in chunking strategies.
- Parser injection and registry configuration for API, Next.js, and React integrations.
- HTML/URL rendering safety and portable pack/unpack behavior.
- Missing regression tests for public packages and high-risk behavior.
- CI coverage, lint scope, security-audit enforcement, and package/documentation consistency.

The design does not add new converters, change the AST schema, or make a string input perform filesystem I/O. A string remains text content; file-backed callers use `ConversionInput` with bytes and a filename, which works in Node and browsers.

## Architecture

### 1. Core input and output contract

`MarkItDown` remains the high-level orchestrator. Its raw input overloads will support `Uint8Array`, `ArrayBuffer`, `Blob`, `File`, and string content. Normalization will preserve `File.name` and `Blob.type`, infer MIME from bytes only where safe, and leave explicit `ConversionInput` hints intact. No runtime-specific filesystem dependency will be added to the core package.

`ConversionOptions.outputFormat` will be applied by the high-level conversion methods through the configured renderer. `convert()` continues to return the canonical Markdown result, while `convertToJson()` and related methods use the selected renderer consistently.

Chunking runs only when a chunker, AST, and `options.chunking.enabled !== false` are present. Existing callers that omit `enabled` but provide chunking options continue to receive chunks.

### 2. Chunking traversal

Chunking strategies will operate on semantic block-level nodes rather than every AST node. Each source block is collected once, preventing text/container duplication. Heading paths, page boundaries, max-token splitting, overlap, and chunk metadata remain part of the existing API. Tests will assert exact content occurrence and metadata instead of only checking chunk counts.

### 3. Integration configuration

Integration packages will not silently construct an empty parser when conversion is requested:

- API will expose `createApp({ parser })` and `startServer({ parser, port })`; the default exported app remains available for health/formats but its conversion route reports a clear configuration error if no converters are registered.
- Next route/server-action helpers will accept a parser through options/factory functions and use it for conversion. Existing convenience functions remain where possible, with clear behavior when no parser is supplied.
- React provider/hooks will share an injected `MarkItDown` instance and/or registered converters. The default behavior will not claim to support conversion without configured converters.

Documentation and exports will describe the actual names and signatures. The all-in-one package remains the place for the preconfigured converter set; package dependency cycles will not be introduced to make integrations implicitly depend on it.

### 4. Safety and portable bundles

HTML renderer attribute values, including heading IDs and URLs, will be escaped. URL-bearing output will reject unsafe `javascript:`, `data:` (except approved image cases where applicable), and similar schemes in rendered links. The React preview will use the same safety rule rather than interpolating untrusted Markdown URLs into executable HTML.

Pack/unpack will use typed payload structures, validate the pack format before decoding, and use runtime-portable UTF-8/base64 helpers. Compression options that are not implemented will throw an explicit error rather than silently producing an uncompressed bundle.

### 5. Repository quality

The root scripts and CI will cover all workspace packages and the demo source. Security audit failures at high severity will fail CI. Public package manifests will be checked for stale duplicate metadata, and documentation/examples will be updated to use `data` rather than the nonexistent `source` property. Placeholder optimizer behavior will either be implemented for the advertised rule or removed from the built-in advertised set; no no-op feature will remain presented as working.

## Error handling

- Missing converter configuration returns the existing conversion error shape with an actionable message.
- Unsupported output formats and pack compression modes fail synchronously with clear errors.
- Invalid pack format/base64/JSON payloads fail with a package-specific error rather than returning partial data.
- Existing cancellation and converter error wrapping behavior remains intact.
- Security sanitization is conservative: unsafe URLs are omitted or rendered as inert text, never executed.

## Testing strategy

- Add failing unit tests before each production change.
- Core tests cover Blob type preservation, ArrayBuffer input, output formats, and disabled chunking.
- Chunking tests cover exact text occurrence, heading/page boundaries, max-token splitting, and overlap metadata.
- Integration tests use a small injected mock converter/parser to verify API, Next, and React wiring without loading heavyweight converter packages.
- Pack and optimizer tests cover Unicode, invalid payloads, unsupported compression, rule behavior, and AST immutability.
- Renderer tests cover escaped attributes and unsafe URLs.
- Run format, lint, typecheck, build, tests, and coverage checks after implementation. If pnpm remains unavailable, report that verification limitation explicitly.

## Compatibility

The AST and converter interfaces remain unchanged. The core string-input meaning remains text content, so no Node-only file reading is introduced. Integration APIs gain explicit parser configuration while retaining existing exports where practical; documentation will clearly identify any changed required option.
