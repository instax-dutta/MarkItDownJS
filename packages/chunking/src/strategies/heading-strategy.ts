import type { AnyNode, DocumentChunk, ChunkingOptions, HeadingNode } from "@markitdownjs/shared";
import { getNodeText, isNodeOfType } from "@markitdownjs/shared";
import type { ChunkingStrategy } from "../chunker.js";
import { createChunk } from "../chunker.js";

const DEFAULT_MAX_TOKENS = 512;

/** Resolve the tokenizer function from options (cached per chunk call) */
function resolveCountTokens(options: ChunkingOptions): (text: string) => number {
  if (options.tokenizerFn) return options.tokenizerFn;
  return (text: string) => text.split(/\s+/).filter(Boolean).length;
}

/** Splits a document by heading boundaries */
export class HeadingChunkingStrategy implements ChunkingStrategy {
  name = "heading";

  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const overlapTokens = options.overlap ?? 0;
    const countTokens = resolveCountTokens(options);
    const headingPath: string[] = [];
    const chunks: DocumentChunk[] = [];
    let currentNodes: AnyNode[] = [];
    let startIndex = 0;
    let globalOffset = 0;

    // Overlap state: trailing text from the previous chunk.
    let overlapText = "";

    const flushChunk = (): void => {
      if (currentNodes.length === 0) return;

      // Prepend overlap from previous chunk if configured.
      let nodesToChunk = [...currentNodes];
      if (overlapText && overlapTokens > 0) {
        const overlapNode: AnyNode = { type: "paragraph", children: [{ type: "text", value: overlapText }] };
        nodesToChunk = [overlapNode, ...nodesToChunk];
      }

      const chunk = createChunk(
        nodesToChunk,
        [...headingPath],
        options,
        startIndex,
        globalOffset
      );
      if (chunk) {
        // Set overlap metadata.
        if (overlapText && overlapTokens > 0) {
          (chunk.metadata as any).overlapEnd = overlapText.length;
        }

        if (chunk.metadata.tokenCount > maxTokens) {
          const split = splitLargeChunk(currentNodes, headingPath, options, maxTokens, startIndex, countTokens);
          chunks.push(...split);
        } else {
          chunks.push(chunk);
        }

        // Compute trailing overlap for the next chunk.
        if (overlapTokens > 0) {
          overlapText = extractTrailingText(currentNodes, overlapTokens, countTokens);
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

      const nodeTokens = countTokens(getNodeText(node));
      if (
        node.type !== "heading" &&
        node.type !== "document" &&
        !(parent && isNodeOfType<HeadingNode>(parent, "heading"))
      ) {
        currentNodes.push(node);
        globalOffset += nodeTokens;
      }

      if (nodeTokens > 0 && countNodesTokens(currentNodes, countTokens) >= maxTokens) {
        flushChunk();
      }
    }
  }
}

/**
 * Extract trailing text from nodes for overlap.
 * Returns the last `overlapTokens` worth of text.
 */
function extractTrailingText(
  nodes: AnyNode[],
  overlapTokens: number,
  countTokens: (text: string) => number
): string {
  if (nodes.length === 0) return "";

  // Walk nodes from the end, collecting text until we reach the overlap budget.
  const parts: string[] = [];
  let tokenBudget = overlapTokens;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const text = getNodeText(nodes[i]!);
    const tokens = countTokens(text);
    if (tokens > tokenBudget) {
      // Partial node — take trailing words.
      const words = text.split(/\s+/).filter(Boolean);
      const taken: string[] = [];
      let takenTokens = 0;
      for (let j = words.length - 1; j >= 0 && takenTokens < tokenBudget; j--) {
        taken.unshift(words[j]!);
        takenTokens++;
      }
      parts.unshift(taken.join(" "));
      break;
    }
    parts.unshift(text);
    tokenBudget -= tokens;
  }

  return parts.join("\n\n");
}

function countNodesTokens(nodes: AnyNode[], countTokens: (text: string) => number): number {
  return nodes.reduce((sum, n) => sum + countTokens(getNodeText(n)), 0);
}

function splitLargeChunk(
  nodes: AnyNode[],
  headingPath: string[],
  options: ChunkingOptions,
  maxTokens: number,
  startIndex: number,
  countTokens: (text: string) => number
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let buffer: AnyNode[] = [];
  let offset = startIndex;

  for (const node of nodes) {
    const nodeTokens = countTokens(getNodeText(node));
    const bufferTokens = countNodesTokens(buffer, countTokens);

    if (bufferTokens + nodeTokens > maxTokens && buffer.length > 0) {
      const chunk = createChunk(buffer, headingPath, options, offset, offset + bufferTokens);
      if (chunk) chunks.push(chunk);
      offset += bufferTokens;
      buffer = [];
    }

    if (nodeTokens > maxTokens && node.type === "paragraph" && "children" in node) {
      const subChunks = splitParagraph(node as AnyNode, headingPath, options, maxTokens, offset, countTokens);
      chunks.push(...subChunks);
      offset += nodeTokens;
    } else {
      buffer.push(node);
    }
  }

  if (buffer.length > 0) {
    const bufferTokens = countNodesTokens(buffer, countTokens);
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
  countTokens: (text: string) => number
): DocumentChunk[] {
  const text = getNodeText(node);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: DocumentChunk[] = [];
  let offset = startIndex;
  let buffer = "";
  let bufferTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);
    if (bufferTokens + sentenceTokens > maxTokens && buffer) {
      chunks.push({
        id: crypto.randomUUID(),
        content: buffer,
        metadata: {
          chunkId: crypto.randomUUID(),
          headingPath: [...headingPath],
          tokenCount: bufferTokens,
          sourceFile: options.sourceFile,
          startIndex: offset,
          endIndex: offset + bufferTokens,
        },
        ast: { type: "paragraph", children: [{ type: "text", value: buffer }] },
      });
      offset += bufferTokens;
      buffer = "";
      bufferTokens = 0;
    }
    buffer = buffer ? `${buffer} ${sentence}` : sentence;
    bufferTokens += sentenceTokens;
  }

  if (buffer) {
    chunks.push({
      id: crypto.randomUUID(),
      content: buffer,
      metadata: {
        chunkId: crypto.randomUUID(),
        headingPath: [...headingPath],
        tokenCount: bufferTokens,
        sourceFile: options.sourceFile,
        startIndex: offset,
        endIndex: offset + bufferTokens,
      },
      ast: { type: "paragraph", children: [{ type: "text", value: buffer }] },
    });
  }

  return chunks;
}
