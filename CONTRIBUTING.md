# Contributing to MarkItDownJS

Thank you for your interest in contributing!

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Setup

```bash
git clone https://github.com/markitdownjs/markitdownjs.git
cd markitdownjs
pnpm install
pnpm build
pnpm test
```

## Development Workflow

### Project structure

```
packages/
  shared/        # Base types, AST nodes, utilities
  core/          # Parser, pipeline, registry
  ast/           # AST renderers (markdown, html, json, plaintext)
  chunking/      # Chunking strategies
  pdf/           # PDF converter
  docx/          # DOCX converter
  pptx/          # PPTX converter
  xlsx/          # XLSX converter
  html/          # HTML converter
  csv/           # CSV converter
  json/          # JSON converter
  xml/           # XML converter
  epub/          # EPUB converter
  audio/         # Audio converter
  image-ocr/     # Image OCR converter
  archive/       # ZIP/archive converter
  react/         # React hooks and components
  next/          # Next.js integration
  cli/           # CLI tool
  api/           # HTTP API server
```

### Commands

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint all packages
pnpm typecheck      # Type-check all packages
pnpm format         # Format code with Prettier
```

## Making Changes

### Adding a new converter

1. Create `packages/<format>/` following the structure of an existing converter (e.g. `packages/csv/`)
2. Export a converter implementing the `Converter` interface from `@markitdownjs/shared`
3. Add tests in `packages/<format>/src/__tests__/`
4. Register in `packages/core` if it should be a default converter

### Architecture rules

- **AST first**: converters must produce a `DocumentNode` AST, not raw Markdown
- **No Python**: no subprocess calls, no Python runtime dependencies
- **Plugin-based**: core must not import converter packages directly
- **Typed**: all public APIs must be fully typed

## Pull Requests

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make changes with tests
3. Ensure CI passes: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
4. Add a changeset: `pnpm changeset`
5. Open a PR against `main`

### PR checklist

- [ ] Tests added/updated
- [ ] Types updated
- [ ] `pnpm changeset` added (if public API change)
- [ ] No breaking changes without major version bump

## Reporting Bugs

Open an issue with:
- Package name and version
- Node.js version
- Minimal reproduction
- Expected vs actual behavior

## Security

See [SECURITY.md](./SECURITY.md) for reporting security vulnerabilities.
