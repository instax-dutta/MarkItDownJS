import type {
  AnyNode,
  DocumentChunk,
  ChunkingOptions,
  HeadingNode,
} from "@markitdownjs/shared";
import {
  getNodeText,
  isNodeOfType,
  countTokens,
} from "@markitdownjs/shared";
import type { ChunkingStrategy } from "../chunker.js";
import { createChunk } from "../chunker.js";

const DEFAULT_MAX_TOKENS = 512;

/** Splits a document by heading boundaries */
export class HeadingChunkingStrategy implements ChunkingStrategy {
  name = "heading";

  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const headingPath: string[] = [];
    const chunks: DocumentChunk[] = [];
    let currentNodes: AnyNode[] = [];
    let startIndex = 0;
    let globalOffset = 0;

    const flushChunk = (): void => {
      if (currentNodes.length === 0) return;
      const chunk = createChunk(
        [...currentNodes],
        [...headingPath],
        options,
        startIndex,
        globalOffset,
      );
      if (chunk) {
        if (countTokens(chunk.ast) > maxTokens) {
          const split = splitLargeChunk(currentNodes, headingPath, options, maxTokens, startIndex);
          chunks.push(...split);
        } else {
          chunks.push(chunk);
        }
      }
      currentNodes = [];
      startIndex = globalOffset;
    };

    walk(ast, null);

    flushChunk();

    return chunks;

    function walk(node: AnyNode, parent: AnyNode | null): void {
      if (isNodeOfType<HeadingNode>(node, "heading")) {
        flushChunk();
        headingPath.length = node.level - 1;
        headingPath[node.level - 1] = getNodeText(node);
      }

      if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          walk(child, node);
        }
      }

      const nodeTokens = countTokens(node);
      if (
        node.type !== "heading" &&
        node.type !== "document" &&
        !(parent && isNodeOfType<HeadingNode>(parent, "heading"))
      ) {
        currentNodes.push(node);
        globalOffset += nodeTokens;
      }

      if (nodeTokens > 0 && countTokensArray(currentNodes) >= maxTokens) {
        flushChunk();
      }
    }
  }
}

function countTokensArray(nodes: AnyNode[]): number {
  return nodes.reduce((sum, n) => sum + countTokens(n), 0);
}

function splitLargeChunk(
  nodes: AnyNode[],
  headingPath: string[],
  options: ChunkingOptions,
  maxTokens: number,
  startIndex: number,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let buffer: AnyNode[] = [];
  let offset = startIndex;

  for (const node of nodes) {
    const nodeTokens = countTokens(node);
    const bufferTokens = countTokensArray(buffer);

    if (bufferTokens + nodeTokens > maxTokens && buffer.length > 0) {
      const chunk = createChunk(buffer, headingPath, options, offset, offset + bufferTokens);
      if (chunk) chunks.push(chunk);
      offset += bufferTokens;
      buffer = [];
    }

    if (nodeTokens > maxTokens && node.type === "paragraph" && "children" in node) {
      const subChunks = splitParagraph(node as AnyNode, headingPath, options, maxTokens, offset);
      chunks.push(...subChunks);
      offset += nodeTokens;
    } else {
      buffer.push(node);
    }
  }

  if (buffer.length > 0) {
    const bufferTokens = countTokensArray(buffer);
    const chunk = createChunk(buffer, headingPath, options, offset, offset + bufferTokens);
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

function splitParagraph(
  node: AnyNode,
  headingPath: string[],
  options: ChunkingOptions,
  maxTokens: number,
  startIndex: number,
): DocumentChunk[] {
  const text = getNodeText(node);
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: DocumentChunk[] = [];
  let offset = startIndex;

  for (let i = 0; i < words.length; i += maxTokens) {
    const slice = words.slice(i, i + maxTokens);
    const value = slice.join(" ");
    const tokenCount = slice.length;
    chunks.push({
      id: crypto.randomUUID(),
      content: value,
      metadata: {
        chunkId: crypto.randomUUID(),
        headingPath: [...headingPath],
        tokenCount,
        sourceFile: options.sourceFile,
        startIndex: offset,
        endIndex: offset + tokenCount,
      },
      ast: { type: "paragraph", children: [{ type: "text", value }] },
    });
    offset += tokenCount;
  }

  return chunks;
}


