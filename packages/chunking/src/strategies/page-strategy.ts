import type { AnyNode, DocumentChunk, ChunkingOptions, PageBreakNode } from "@markitdownjs/shared";
import { walkAst, isNodeOfType, countTokens } from "@markitdownjs/shared";
import type { ChunkingStrategy } from "../chunker.js";
import { createChunk } from "../chunker.js";

const DEFAULT_MAX_TOKENS = 512;

/** Splits a document by page break boundaries */
export class PageChunkingStrategy implements ChunkingStrategy {
  name = "page";

  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const chunks: DocumentChunk[] = [];
    let currentNodes: AnyNode[] = [];
    let currentPage: number | undefined;
    let startIndex = 0;
    let globalOffset = 0;
    let hasPageBreaks = false;

    const flushChunk = (page?: number): void => {
      if (currentNodes.length === 0) return;
      const chunk = createChunk([...currentNodes], [], options, startIndex, globalOffset, page);
      if (chunk) {
        if (countTokens(chunk.ast) > maxTokens) {
          const split = splitLargeChunk(currentNodes, options, maxTokens, startIndex, page);
          chunks.push(...split);
        } else {
          chunks.push(chunk);
        }
      }
      currentNodes = [];
      startIndex = globalOffset;
    };

    walkAst(ast, (node, _parent) => {
      if (isNodeOfType<PageBreakNode>(node, "page-break")) {
        hasPageBreaks = true;
        flushChunk(currentPage);
        currentPage = node.pageNumber;
        return;
      }

      currentNodes.push(node);
      const tokens = countTokens(node);
      globalOffset += tokens;

      if (tokens > 0 && countTokensArray(currentNodes) >= maxTokens) {
        flushChunk(currentPage);
      }
    });

    flushChunk(currentPage);

    if (!hasPageBreaks) {
      if (chunks.length === 0) return [];
      if (chunks.length === 1) {
        const single = chunks[0]!;
        const totalTokens = countTokens(single.ast);
        if (totalTokens > maxTokens) {
          return splitLargeChunk(
            [single.ast],
            options,
            maxTokens,
            single.metadata.startIndex,
            single.metadata.page
          );
        }
        return chunks;
      }
    }

    return chunks;
  }
}

function countTokensArray(nodes: AnyNode[]): number {
  return nodes.reduce((sum, n) => sum + countTokens(n), 0);
}

function splitLargeChunk(
  nodes: AnyNode[],
  options: ChunkingOptions,
  maxTokens: number,
  startIndex: number,
  page?: number
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let buffer: AnyNode[] = [];
  let offset = startIndex;

  for (const node of nodes) {
    const nodeTokens = countTokens(node);
    const bufferTokens = countTokensArray(buffer);

    if (bufferTokens + nodeTokens > maxTokens && buffer.length > 0) {
      const chunk = createChunk(buffer, [], options, offset, offset + bufferTokens, page);
      if (chunk) chunks.push(chunk);
      offset += bufferTokens;
      buffer = [];
    }

    buffer.push(node);
  }

  if (buffer.length > 0) {
    const bufferTokens = countTokensArray(buffer);
    const chunk = createChunk(buffer, [], options, offset, offset + bufferTokens, page);
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}
