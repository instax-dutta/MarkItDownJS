# @markitdownjs/cli

[![npm](https://img.shields.io/npm/v/@markitdownjs/cli)](https://www.npmjs.com/package/@markitdownjs/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool for converting documents from the terminal. Part of [MarkItDownJS](https://github.com/markitdownjs/markitdownjs).

## Install

```bash
npm install -g @markitdownjs/cli
```

## Commands

### `convert` — convert a single file

```bash
markitdownjs convert report.pdf --output report.md
markitdownjs convert data.json --format markdown
```

### `batch` — convert all files in a directory

```bash
markitdownjs batch ./docs --output ./output --format markdown
```

### `serve` — start an HTTP conversion server

```bash
markitdownjs serve --port 3000
```

### `watch` — watch a directory and convert on change

```bash
markitdownjs watch ./inbox --output ./processed
```

## Options

| Flag | Description |
|------|-------------|
| `--output <path>` | Output file or directory |
| `--format <fmt>` | Output format: `markdown` (default), `json`, `text` |
| `--port <n>` | Port for `serve` command (default: `3000`) |
| `--concurrency <n>` | Parallel workers for `batch` (default: `4`) |
| `--verbose` | Print per-file progress |

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
