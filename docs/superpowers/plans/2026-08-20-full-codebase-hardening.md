# Full Codebase Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the confirmed high-impact correctness, security, integration, CI, packaging, testing, and documentation defects found in the MarkItDownJS monorepo.

**Architecture:** Keep the existing AST and converter interfaces stable. Normalize portable inputs in core, make chunkers consume semantic block nodes exactly once, inject configured parsers into integrations, and add focused regression tests at each boundary. Keep the all-in-one preset separate so API/Next/React do not create a package dependency cycle.

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, Vitest, ESLint, Prettier, Hono, React, Next.js-compatible Web APIs, JSZip.

**Spec:** `docs/superpowers/specs/2026-08-20-full-codebase-hardening-design.md`

## Global Constraints

- Node.js support remains `>=20.0.0`.
- The core package must not add Node-only filesystem I/O; strings remain text content.
- The AST and `Converter` interfaces remain unchanged.
- File-backed callers use `ConversionInput` with `data`, `fileName`, and optional `mimeType`.
- Every production behavior change starts with a failing test and is verified with the relevant pnpm command.
- Do not silently ignore unsupported output formats, compression modes, parser configuration, or invalid pack payloads.
- Do not commit changes unless the user explicitly requests a commit.

---

## Task 1: Correct portable input normalization and output formatting

**Files:**
- Modify: `packages/core/src/parser.ts`
- Modify: `packages/core/src/pipeline.ts`
- Modify: `packages/core/src/__tests__/parser.test.ts`
- Modify: `packages/core/src/__tests__/pipeline.test.ts`
- Modify: `packages/shared/src/utils.ts` only if the tests expose a MIME helper defect
- Test: existing core parser and pipeline test files

**Interfaces:**
- `MarkItDown.convert(input)` accepts `ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string`.
- `normalizeInput()` preserves explicit `ConversionInput` values, maps `File.name` to `fileName`, maps `Blob.type` to `mimeType`, and detects raw byte MIME only when no explicit hint exists.
- `convert()` continues returning canonical Markdown; format-specific CLI/API output uses the existing renderer and does not mutate the canonical `ConversionResult.markdown` field.

- [ ] **Step 1: Write failing parser tests for raw `ArrayBuffer` and typed `Blob`.**

Use a mock converter that accepts `text/plain` and assert that converting a `Blob(["hello"], { type: "text/plain" })` and an `ArrayBuffer` reaches the converter with the expected MIME/data. The current implementation either drops the Blob type or rejects the raw ArrayBuffer overload.

- [ ] **Step 2: Run the focused parser tests and verify the new tests fail for the expected normalization reasons.**

Run: `pnpm exec vitest run packages/core/src/__tests__/parser.test.ts`
Expected: the new Blob/ArrayBuffer tests fail before implementation.

- [ ] **Step 3: Write a failing test for `chunking.enabled: false`.**

Assert that a registered chunker is not called when options contain `{ chunking: { enabled: false } }`. Keep format-specific rendering tests in Task 6, where CLI/API output is wired to the existing renderer without changing the canonical conversion result.

- [ ] **Step 4: Implement minimal normalization and chunking-gate changes.**

Add `ArrayBuffer` to the high-level overload, preserve Blob MIME metadata, use `detectMimeTypeFromBuffer` when a filename is available, and gate auto-chunking on `enabled !== false`. Leave canonical Markdown rendering unchanged.

- [ ] **Step 5: Run the focused tests and then the core package tests.**

Run: `pnpm exec vitest run packages/core/src/__tests__/parser.test.ts packages/core/src/__tests__/pipeline.test.ts`
Expected: all focused tests pass, including existing cancellation and converter-selection tests.

---

## Task 2: Remove duplicate content from chunking strategies

**Files:**
- Modify: `packages/chunking/src/chunker.ts`
- Modify: `packages/chunking/src/strategies/heading-strategy.ts`
- Modify: `packages/chunking/src/strategies/page-strategy.ts`
- Modify: `packages/chunking/src/strategies/semantic-strategy.ts`
- Modify: `packages/chunking/src/strategies/fixed-strategy.ts` only if shared block collection requires it
- Modify: `packages/chunking/src/__tests__/chunker.test.ts`
- Test: `packages/chunking/src/__tests__/chunker.test.ts`

**Interfaces:**
- Add an internal block collector that recursively unwraps only `document`/`section` containers and returns each semantic block node once.
- A block includes headings, paragraphs, tables, lists, code, blockquotes, thematic/horizontal rules, and page breaks; inline descendants are not independently emitted.
- Existing strategy names and `DocumentChunker.chunk(ast, options)` signatures remain unchanged.

- [ ] **Step 1: Write a failing exact-content test for heading chunking.**

Build an AST containing one heading and one paragraph with unique text. Assert that each chunk’s content contains each source phrase exactly once, and that heading paths remain correct. The current recursive collector emits text and paragraph content more than once.

- [ ] **Step 2: Run the focused chunker test and verify it fails because content is duplicated.**

Run: `pnpm exec vitest run packages/chunking/src/__tests__/chunker.test.ts`
Expected: the exact occurrence assertion fails against the existing traversal.

- [ ] **Step 3: Add failing page and semantic strategy tests.**

Assert that a page-break AST creates page-bounded chunks without document/text duplicates, and that semantic chunks contain each paragraph once. Assert fixed chunking with `maxTokens > overlap` never repeats the same start position indefinitely.

- [ ] **Step 4: Implement a shared semantic block collector and update strategies to use it.**

Use the collector at the strategy boundary; preserve heading-path updates and page-break handling. Ensure token offsets advance from block text only, and retain existing max-token split functions unless a failing test proves their offsets incorrect.

- [ ] **Step 5: Run all chunking tests and inspect the output for duplicate source phrases.**

Run: `pnpm exec vitest run packages/chunking/src/__tests__/chunker.test.ts`
Expected: all existing and new tests pass with unique source content.

---

## Task 3: Make API, Next.js, and React integrations use configured parsers

**Files:**
- Modify: `packages/api/src/app.ts`
- Modify: `packages/api/src/server.ts`
- Modify: `packages/api/src/index.ts`
- Create: `packages/api/src/__tests__/app.test.ts`
- Modify: `packages/next/src/api-route.ts`
- Modify: `packages/next/src/route-handler.ts`
- Modify: `packages/next/src/server-action.ts`
- Modify: `packages/next/src/index.ts`
- Create: `packages/next/src/__tests__/integration.test.ts`
- Modify: `packages/react/src/provider.tsx`
- Modify: `packages/react/src/hooks.ts`
- Modify: `packages/react/src/index.ts`
- Modify: `packages/react/README.md`

**Interfaces:**
- API exports `createApp(options?: { parser?: MarkItDown })` and `startServer(options: { parser?: MarkItDown; port?: number })`.
- Next conversion factories accept `{ parser: MarkItDown; ...existingOptions }`; direct route helpers accept an optional parser and return a clear configuration error when absent.
- `MarkItDownProvider` accepts `{ children, parser?, converters? }`; hooks use the shared configured parser rather than constructing a new empty parser for every file.

- [ ] **Step 1: Write failing Hono tests using an injected mock parser.**

Create a mock `MarkItDown`-compatible object whose `convert()` returns a known `ConversionResult`. Assert `createApp({ parser })` sends `/convert` to that parser and that `createApp()` returns a clear configuration error instead of the generic empty-registry failure.

- [ ] **Step 2: Run the API tests and verify they fail because `createApp` is not exported and the route constructs its own parser.**

Run: `pnpm exec vitest run packages/api/src/__tests__/app.test.ts`
Expected: import/configuration assertions fail before implementation.

- [ ] **Step 3: Write failing Next route tests for parser injection.**

Use a multipart `Request` containing a `File`, inject the mock parser into `createConvertRoute`, `convertRoute`, and `batchRoute`, and assert the returned JSON contains the mock result. Add a missing-parser test for the documented clear error.

- [ ] **Step 4: Implement API and Next parser factories while preserving health/formats endpoints.**

Move parser resolution to the factory/options boundary, export the new factories, update `server.ts` to call `startServer`, and avoid package imports from `@markitdownjs/all` so the existing dependency graph remains acyclic.

- [ ] **Step 5: Write a React wiring test or compile-level regression fixture.**

Verify the provider accepts an injected parser and that the hook path calls that parser. If the repository’s installed test environment lacks a React renderer, keep this as a TypeScript API fixture and run the package typecheck; do not add a new testing library solely for this audit.

- [ ] **Step 6: Update integration READMEs and run API/Next/React package checks.**

Run: `pnpm exec vitest run packages/api/src/__tests__/app.test.ts packages/next/src/__tests__/integration.test.ts`
Run: `pnpm --filter @markitdownjs/api typecheck && pnpm --filter @markitdownjs/next typecheck && pnpm --filter @markitdownjs/react typecheck`
Expected: injected parsers are used and public exports match documentation.

---

## Task 4: Harden HTML rendering, Markdown preview, and portable pack/unpack

**Files:**
- Modify: `packages/ast/src/html-renderer.ts`
- Modify: `packages/ast/src/__tests__/renderers.test.ts`
- Modify: `packages/react/src/components.tsx`
- Modify: `packages/pack/src/pack.ts`
- Modify: `packages/pack/src/types.ts`
- Modify: `packages/pack/src/index.ts`
- Create: `packages/pack/src/__tests__/pack.test.ts`

**Interfaces:**
- HTML rendering escapes attribute values and emits only safe link/image URL schemes.
- `pack()` returns a validated `PackBundle`; `unpack()` returns typed packed data and rejects a wrong format, malformed base64, malformed UTF-8/JSON, or unsupported compression.
- Compression values `gzip` and `brotli` are rejected explicitly until implemented; `none` remains the default and existing behavior.

- [ ] **Step 1: Write failing renderer tests for escaped heading IDs and unsafe URLs.**

Construct heading/link/image nodes containing quotes, `<`, and `javascript:` URLs. Assert output contains escaped attributes and no executable unsafe URL.

- [ ] **Step 2: Run renderer tests and verify the new safety assertions fail.**

Run: `pnpm exec vitest run packages/ast/src/__tests__/renderers.test.ts`
Expected: current raw `id` and URL interpolation fails the assertions.

- [ ] **Step 3: Implement minimal attribute escaping and URL policy helpers.**

Escape all interpolated HTML attributes and return inert/empty output for unsafe link URLs. Apply the same policy in `MarkdownViewer` before `dangerouslySetInnerHTML`, retaining escaped text rendering for unsupported Markdown constructs.

- [ ] **Step 4: Write failing pack tests for Unicode, invalid format, malformed payload, and compression options.**

Pack a Unicode Markdown result and assert round-trip equality. Assert `unpack({ format: "other", ... })` and malformed payloads throw, and `pack(result, { compression: "gzip" })` throws an explicit unsupported-compression error.

- [ ] **Step 5: Implement typed portable base64/UTF-8 helpers and validation.**

Avoid `unescape`/`escape`, validate `bundle.format`, decode bytes with `TextDecoder`, parse the payload into explicit interfaces, and preserve `includeAst`/`includeChunks` semantics.

- [ ] **Step 6: Run AST and pack tests.**

Run: `pnpm exec vitest run packages/ast/src/__tests__/renderers.test.ts packages/pack/src/__tests__/pack.test.ts`
Expected: security and Unicode round-trip tests pass.

---

## Task 5: Complete optimizer behavior and add public-package regression tests

**Files:**
- Modify: `packages/optimizer/src/rules.ts`
- Modify: `packages/optimizer/src/optimizer.ts`
- Modify: `packages/optimizer/src/types.ts`
- Create: `packages/optimizer/src/__tests__/optimizer.test.ts`
- Create: `packages/api/src/__tests__/middleware.test.ts`
- Create: `packages/shared/src/__tests__/utils.test.ts`
- Modify: `packages/shared/src/utils.ts` only when a failing utility test identifies a defect

**Interfaces:**
- `OptimizerRule.applies` accepts `AnyNode`, matching the nodes traversed by the optimizer.
- `collapseRepeatedHeaders` removes consecutive duplicate table header rows while preserving the first header and table metadata.
- Rules return new nodes and do not mutate the caller’s AST.

- [ ] **Step 1: Write failing optimizer tests for duplicate table headers, rule typing, and AST immutability.**

Build a table with two consecutive identical header rows, run the rule, assert only one remains, and assert the original table is unchanged. Add tests for existing image/comment/list rules.

- [ ] **Step 2: Run optimizer tests and verify the repeated-header test fails because the current rule is a no-op.**

Run: `pnpm exec vitest run packages/optimizer/src/__tests__/optimizer.test.ts`
Expected: duplicate header remains before implementation.

- [ ] **Step 3: Implement table-header comparison and clone-safe rule traversal.**

Compare row cell text via shared AST text extraction, remove only consecutive duplicate header rows, and update types so `applies` receives `AnyNode`.

- [ ] **Step 4: Add utility and middleware tests for high-risk behavior.**

Cover magic-byte MIME detection, extension fallback, abort behavior, rate-limit boundaries, and file-size validation. Keep tests deterministic by using a fake clock only if the existing test setup supports it; otherwise use distinct windows/options without timing sleeps.

- [ ] **Step 5: Run optimizer, shared, and API middleware tests.**

Run: `pnpm exec vitest run packages/optimizer/src/__tests__/optimizer.test.ts packages/shared/src/__tests__/utils.test.ts packages/api/src/__tests__/middleware.test.ts`
Expected: all new tests pass without mutating source ASTs.

---

## Task 6: Fix workspace scripts, CI coverage, package metadata, and docs

**Files:**
- Modify: `package.json`
- Modify: `eslint.config.js`
- Modify: `turbo.json` only if task graph coverage requires it
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `packages/core/README.md`
- Modify: `packages/api/README.md`
- Modify: `packages/next/README.md`
- Modify: `packages/react/README.md`
- Modify: `examples/basic-usage/index.ts`
- Modify: `examples/express-api/server.ts`
- Modify: `examples/cli-usage/cli-examples.ts`
- Modify: `examples/plugin-example/index.ts`
- Modify: `examples/rag-chunking/index.ts`
- Modify: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Modify: `packages/markitdownjs/package.json`
- Modify: `apps/demo/src/App.tsx`
- Create: `apps/demo/README.md`

**Interfaces:**
- Root lint covers package and demo TypeScript sources without requiring generated files.
- CI verifies build output for every package in `packages/`, including `pack`, `optimizer`, `all`, and `markitdownjs`, and runs demo typecheck/build as its own job or step.
- High-severity `pnpm audit` failures fail CI.
- Documentation uses `ConversionInput.data`, current exported class/function names, and the actual scoped package name.

- [ ] **Step 1: Write a repository script/config regression checklist from current failures.**

Record the commands and expected package list: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`, and `pnpm --filter demo build`. Use the checklist to avoid changing a command without verifying its output.

- [ ] **Step 2: Fix the demo’s stale state and add its README.**

Change `handleConvert` to accept the selected `File` alongside the `ConversionResult` (and update `DocumentDropzone.onConvert` accordingly), set the displayed filename from `file.name`, remove unused conversion state, and document the actual local/deployed demo commands. Preserve the existing visual design.

- [ ] **Step 3: Align lint, output-format, and CI coverage.**

Expand lint to `packages/*/src` and `apps/*/src`, update CLI/API format branches to render JSON/HTML/plaintext through the existing renderer while preserving `ConversionResult.markdown`, add an app typecheck/build step, enumerate all workspace package outputs or use a workspace-aware verification command, and remove `continue-on-error` from the high-severity audit step.

- [ ] **Step 4: Correct package metadata and stale documentation.**

Remove the duplicate `all-in-one` keyword, fix invalid `source` examples, replace imports that claim an unscoped package exists, update stale API names (`createApp`, parser options, provider names), and remove or clearly label unsupported claims such as converting file paths through a string.

- [ ] **Step 5: Run formatting and static checks on the changed files.**

Run: `pnpm format:check && pnpm lint && pnpm --filter demo build`
Expected: no format/lint errors and the demo build succeeds.

---

## Task 7: Full verification and review pass

**Files:**
- Modify only files required by verification failures.

- [ ] **Step 1: Run the complete test suite.**

Run: `pnpm test`
Expected: zero failed tests and no unhandled errors.

- [ ] **Step 2: Run the complete typecheck and build.**

Run: `pnpm typecheck && pnpm build`
Expected: all workspace projects typecheck and emit their declared `dist` outputs.

- [ ] **Step 3: Run coverage and security checks.**

Run: `pnpm test:ci && pnpm audit --audit-level=high`
Expected: coverage command completes and high-severity audit findings cause a nonzero exit if present.

- [ ] **Step 4: Review the final diff against the spec.**

Check every changed file for public API consistency, no accidental generated artifacts, no secrets, no unrelated refactors, and tests that would fail if the fixed behavior regressed.

- [ ] **Step 5: Report verified results and any environment-blocked checks.**

If pnpm/dependencies remain unavailable, report the exact blocked commands and do not claim the repository is passing.
