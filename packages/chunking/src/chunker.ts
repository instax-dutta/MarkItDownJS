import type { AnyNode, DocumentChunk, ChunkMetadata, ChunkingOptions } from "@markitdownjs/shared";
import { getNodeText, generateId } from "@markitdownjs/shared";
import { HeadingChunkingStrategy } from "./strategies/heading-strategy.js";
import { PageChunkingStrategy } from "./strategies/page-strategy.js";
import { SemanticChunkingStrategy } from "./strategies/semantic-strategy.js";
import { FixedChunkingStrategy } from "./strategies/fixed-strategy.js";

/** Interface for chunking strategy implementations */
export interface ChunkingStrategy {
  /** Strategy name identifier */
  name: string;
  /** Split an AST into document chunks */
  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[];
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
  const tokenCount = content.split(/\s+/).filter(Boolean).length;

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

  /** Chunk an AST using the specified strategy */
  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const strategyName = options.strategy ?? "heading";
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown chunking strategy: ${strategyName}`);
    }
    return strategy.chunk(ast, options);
  }
}
