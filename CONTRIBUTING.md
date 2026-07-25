# Contributing to MarkItDownJS

Thank you for your interest in contributing! This guide will help you get started with the monorepo, understand the architecture, and submit high-quality pull requests.

---

## 1. Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (install via `npm install -g pnpm`)

### Setup

```bash
# Clone the repository
git clone https://github.com/instax-dutta/MarkItDownJS.git
cd MarkItDownJS

# Install dependencies (all 20+ packages)
pnpm install

# Build all packages
pnpm build

# Run tests to verify everything works
pnpm test
```

### Key Commands

```bash
pnpm build          # Build all packages via Turborepo
pnpm test           # Run all tests (Vitest)
pnpm test:watch     # Run tests in watch mode
pnpm lint           # Lint all packages (ESLint)
pnpm lint:fix       # Auto-fix lint issues
pnpm typecheck      # Type-check all packages
pnpm format         # Format code with Prettier
pnpm format:check   # Check formatting without writing
pnpm changeset      # Create a changeset for versioning
pnpm clean          # Clean all build artifacts
```

---

## 2. Project Structure

```
packages/
  shared/        # Base types, AST nodes, MIME utilities, errors
  core/          # MarkItDown class, pipeline, registry, renderer
  ast/           # AST renderers (markdown, html, json, plaintext) + utilities
  chunking/      # Document chunker + strategies (heading, semantic, page, fixed)
  pdf/           # PDF converter (pdfjs-dist)
  docx/          # DOCX converter
  pptx/          # PPTX converter
  xlsx/          # XLSX converter
  html/          # HTML converter
  csv/           # CSV converter
  json/          # JSON converter
  xml/           # XML converter
  epub/          # EPUB converter
  audio/         # Audio converter (transcription)
  image-ocr/     # Image OCR converter (Tesseract.js)
  archive/       # ZIP/archive converter
  react/         # React hooks and components
  next/          # Next.js API route helpers
  cli/           # CLI tool (Commander.js)
  api/           # HTTP API server (Hono)
  pack/          # Pack/unpack ConversionResults into portable bundles
  optimizer/     # Markdown optimization rules
  all/           # Umbrella package — all converters + renderers + chunker in one
examples/
  basic-usage/    # Minimal Node.js example
  react-app/      # React integration example
  nextjs-app/     # Next.js App Router example
  plugin-example/ # Custom converter plugin example
```

### Package conventions

- Each package lives in `packages/<name>/` with `package.json`, `tsconfig.json`, and `src/`
- Source files use `.js` extensions in imports (TypeScript ESM convention)
- Packages depend on `@markitdownjs/shared` for types and utilities
- Tests go in `src/__tests__/` alongside source code
- The `tsconfig.json` extends the root `tsconfig.base.json` with `"composite": true`

---

## 3. How to Add a New Converter

Converters are the core of MarkItDownJS. Each converter transforms a specific document format into a `ConversionResult`.

### Step-by-step

1. **Scaffold the package:**

```bash
mkdir -p packages/myformat/src/__tests__
```

Create `packages/myformat/package.json`:
```json
{
  "name": "@markitdownjs/myformat",
  "version": "0.1.0",
  "description": "MyFormat converter for MarkItDownJS",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist tsconfig.tsbuildinfo"
  },
  "dependencies": { "@markitdownjs/shared": "workspace:*" },
  "devDependencies": { "typescript": "^5.5.0" }
}
```

2. **Create `packages/myformat/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "composite": true },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

3. **Implement the converter (`packages/myformat/src/myformat-converter.ts`):**

```typescript
import type { ConversionInput, ConversionResult, Converter, DocumentMetadata } from "@markitdownjs/shared";

export class MyFormatConverter implements Converter {
  readonly id = "myformat";
  readonly supportedMimeTypes = ["application/x-myformat"];
  readonly supportedExtensions = [".myf"];

  async canConvert(input: ConversionInput): Promise<boolean> {
    // Check magic bytes or extension
    return input.fileName?.endsWith(".myf") ?? false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const data = input.data;
    const decoder = new TextDecoder("utf-8");
    const text = typeof data === "string" ? data : decoder.decode(data);

    // Parse and convert to markdown
    const markdown = this.parseToMarkdown(text);

    return {
      markdown,
      metadata: {} as DocumentMetadata,
      assets: [],
      tables: [],
      images: [],
      headings: [],
      format: "markdown",
      converterId: this.id,
      stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
    };
  }

  private parseToMarkdown(input: string): string {
    // Your conversion logic here
    return input;
  }
}
```

4. **Create the package entry point (`packages/myformat/src/index.ts`):**

```typescript
export { MyFormatConverter } from "./myformat-converter.js";
```

5. **Write tests (`packages/myformat/src/__tests__/myformat-converter.test.ts`):**

```typescript
import { describe, it, expect } from "vitest";
import { MyFormatConverter } from "../myformat-converter.js";

describe("MyFormatConverter", () => {
  const converter = new MyFormatConverter();

  it("should convert basic content", async () => {
    const result = await converter.convert({ data: "Hello World" });
    expect(result.markdown).toBe("Hello World");
  });
});
```

6. **Register in the root `tsconfig.json`:**

Add `{ "path": "packages/myformat" }` to the `references` array.

7. **Add to `@markitdownjs/all` (optional but recommended):**

Add the dependency in `packages/all/package.json` and export the converter in `packages/all/src/index.ts`.

---

## 4. How to Add a New Chunker

Chunkers split a parsed AST into smaller pieces for RAG workflows.

1. **Create a strategy in `packages/chunking/src/strategies/`:**

```typescript
import type { AnyNode, DocumentChunk, ChunkingOptions } from "@markitdownjs/shared";
import type { ChunkingStrategy } from "../chunker.js";

export class MyChunkingStrategy implements ChunkingStrategy {
  readonly name = "my-strategy";

  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    // Your chunking logic here
    return [];
  }
}
```

2. **Register it in `packages/chunking/src/chunker.ts`:**

Add `this.registerStrategy(new MyChunkingStrategy());` in the `DocumentChunker` constructor.

3. **Export it in `packages/chunking/src/index.ts`:**

```typescript
export { MyChunkingStrategy } from "./strategies/my-strategy.js";
```

---

## 5. Testing

We use **Vitest** for all testing.

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @markitdownjs/pdf test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:ci
```

### Writing tests

- Place tests in `src/__tests__/` next to the source files
- Name test files `*.test.ts`
- Use `describe` / `it` / `expect` from Vitest
- For converters, test both `canConvert` and `convert`

---

## 6. Creating a Changeset

If your change affects the public API (new exports, new packages, behavior changes), you must create a changeset.

```bash
pnpm changeset
```

This will prompt you to:
1. Select the affected packages (space to select, enter to confirm)
2. Choose the bump type (`patch` for bug fixes, `minor` for features, `major` for breaking)
3. Write a summary of the change

The changeset file will be created in `.changeset/`. Commit it alongside your code changes.

Changesets are consumed during the release process to generate changelogs and version bumps.

---

## 7. Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code builds: `pnpm build`
- [ ] All tests pass: `pnpm test`
- [ ] Lint passes: `pnpm lint`
- [ ] Type-check passes: `pnpm typecheck`
- [ ] Format check passes: `pnpm format:check`
- [ ] New tests added for new functionality
- [ ] Public API changes include a changeset (`pnpm changeset`)
- [ ] Breaking changes accompanied by a major version bump in the changeset
- [ ] Documentation updated (README, JSDoc) for new features
- [ ] Branch is up to date with `main`

### PR title convention

- `feat:` — new feature or converter
- `fix:` — bug fix
- `chore:` — maintenance, deps, CI
- `docs:` — documentation only
- `refactor:` — code restructuring with no behavior change

## Reporting Bugs

Open a bug report using the [Bug Report template](https://github.com/instax-dutta/MarkItDownJS/issues/new?template=bug_report.yml). Include:
- Package name and version
- Node.js version
- Minimal reproduction code
- Expected vs actual behavior

## Feature Requests

Open a feature request using the [Feature Request template](https://github.com/instax-dutta/MarkItDownJS/issues/new?template=feature_request.yml).

## Security

For security vulnerabilities, please see [SECURITY.md](./SECURITY.md) for our responsible disclosure process.
