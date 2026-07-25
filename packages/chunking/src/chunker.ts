import type { AnyNode, DocumentChunk, ChunkMetadata, ChunkingOptions } from "@markitdownjs/shared";
import { getNodeText, generateId } from "@markitdownjs/shared";
import { HeadingChunkingStrategy } from "./strategies/heading-strategy.js";
import { PageChunkingStrategy } from "./strategies/page-strategy.js";
import { SemanticChunkingStrategy } from "./strategies/semantic-strategy.js";
import { FixedChunkingStrategy } from "./strategies/fixed-strategy.js";
import { getDefaultTokenizerRegistry } from "./tokenizers/index.js";
import { classifyChunks } from "./classifier.js";

/** Interface for chunking strategy implementations */
export interface ChunkingStrategy {
  /** Strategy name identifier */
  name: string;
  /** Split an AST into document chunks */
  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[];
}

/** Resolves the tokenizer to use for the given options */
function resolveTokenizer(options: ChunkingOptions): (text: string) => number {
  // Custom function takes priority.
  if (options.tokenizerFn) return options.tokenizerFn;

  // Look up by name/model in the registry.
  if (options.tokenizer) {
    const registry = getDefaultTokenizerRegistry();
    const tok = registry.resolve(options.tokenizer);
    return (text: string) => tok.countTokens(text);
  }

  // Default: fast-bpe fallback.
  const registry = getDefaultTokenizerRegistry();
  const tok = registry.resolve("fast-bpe");
  return (text: string) => tok.countTokens(text);
}

/** Creates a document chunk from collected nodes and metadata */
export function createChunk(
  nodes: AnyNode[],
  headingPath: string[],
  options: ChunkingOptions,
  startIndex: number,
  endIndex: number,
  page?: number
): DocumentChunk | null {
  if (nodes.length === 0) return null;

  const content = nodes.map((n) => getNodeText(n)).join("\n\n");
  const countTokens = resolveTokenizer(options);
  const tokenCount = countTokens(content);

  const root: AnyNode = nodes.length === 1 ? nodes[0]! : { type: "document", children: nodes };

  const metadata: ChunkMetadata = {
    chunkId: generateId(),
    headingPath,
    tokenCount,
    sourceFile: options.sourceFile,
    startIndex,
    endIndex,
    page,
  };

  return { id: metadata.chunkId, content, metadata, ast: root };
}

/** Main document chunker that delegates to registered strategies */
export class DocumentChunker {
  private strategies: Map<string, ChunkingStrategy>;

  constructor() {
    this.strategies = new Map();
    this.registerStrategy(new HeadingChunkingStrategy());
    this.registerStrategy(new PageChunkingStrategy());
    this.registerStrategy(new SemanticChunkingStrategy());
    this.registerStrategy(new FixedChunkingStrategy());
  }

  /** Register a custom chunking strategy */
  registerStrategy(strategy: ChunkingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /** Get a registered strategy by name */
  getStrategy(name: string): ChunkingStrategy | undefined {
    return this.strategies.get(name);
  }

  /** List all registered strategy names */
  listStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /** Chunk an AST using the specified strategy, then classify content types */
  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const strategyName = options.strategy ?? "heading";
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown chunking strategy: ${strategyName}`);
    }
    const rawChunks = strategy.chunk(ast, options);
    return classifyChunks(rawChunks);
  }
}
