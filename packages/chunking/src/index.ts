export { DocumentChunker, createChunk } from "./chunker.js";
export type { ChunkingStrategy } from "./chunker.js";
export { HeadingChunkingStrategy } from "./strategies/heading-strategy.js";
export { PageChunkingStrategy } from "./strategies/page-strategy.js";
export { SemanticChunkingStrategy } from "./strategies/semantic-strategy.js";
export { FixedChunkingStrategy } from "./strategies/fixed-strategy.js";

// Content type classification
export { classifyChunkContentType, classifyChunks } from "./classifier.js";
export type { ContentType } from "./classifier.js";

// Deduplication fingerprinting
export { computeContentHash, computeStructureHash, fingerprintChunks, detectChangedChunks } from "./fingerprint.js";
export type { ChunkFingerprint } from "./fingerprint.js";

// Tokenizer sub-package
export type { Tokenizer } from "./tokenizers/types.js";
export { FastBPETokenizer } from "./tokenizers/fast-bpe.js";
export { TikTokenizer, Cl100kTokenizer, O200kTokenizer } from "./tokenizers/tiktoken.js";
export { TokenizerRegistry, getDefaultTokenizerRegistry } from "./tokenizers/registry.js";
