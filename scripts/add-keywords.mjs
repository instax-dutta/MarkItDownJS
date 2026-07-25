#!/usr/bin/env node
/**
 * Add npm keywords to all @markitdownjs/* package.json files.
 *
 * Run: node scripts/add-keywords.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const BASE_KEYWORDS = [
  "markitdownjs",
  "markdown",
  "document-conversion",
  "typescript",
  "converter",
];

/** Package-specific keywords keyed by directory name (not full scoped name). */
const PACKAGE_KEYWORDS = {
  shared: ["types", "utilities", "ast"],
  core: ["pipeline", "registry", "parser"],
  ast: ["renderer", "markdown-renderer", "html-renderer", "json-renderer", "plaintext"],
  chunking: ["chunking", "rag", "vector-search", "embedding", "document-chunks"],
  pdf: ["pdf"],
  docx: ["docx", "word"],
  pptx: ["pptx", "powerpoint"],
  xlsx: ["xlsx", "excel", "spreadsheet"],
  html: ["html", "web"],
  csv: ["csv", "tsv", "delimiter"],
  json: ["json"],
  xml: ["xml"],
  epub: ["epub", "ebook"],
  audio: ["audio", "transcription", "speech-to-text", "metadata"],
  "image-ocr": ["image", "ocr", "tesseract", "optical-character-recognition"],
  archive: ["archive", "zip", "compression"],
  react: ["react", "hook", "component", "dropzone"],
  next: ["nextjs", "api-route", "server-action"],
  cli: ["cli", "command-line", "terminal"],
  api: ["api", "http-server", "hono", "rest"],
  pack: ["pack", "bundle", "portable"],
  optimizer: ["optimization", "rules", "cleanup"],
  all: ["all-in-one", "umbrella"],
  markitdownjs: ["all-in-one", "unscoped"],
};

for (const [dir, extraKeywords] of Object.entries(PACKAGE_KEYWORDS)) {
  const filePath = join(root, "packages", dir, "package.json");
  try {
    const raw = readFileSync(filePath, "utf-8");
    const pkg = JSON.parse(raw);
    pkg.keywords = [...new Set([...BASE_KEYWORDS, ...extraKeywords])].sort();
    writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`✅ ${pkg.name} → ${pkg.keywords.length} keywords`);
  } catch (err) {
    console.error(`❌ packages/${dir} — ${err.message}`);
  }
}
