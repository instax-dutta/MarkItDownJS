import type {
  AnyNode,
  DocumentChunk,
  ChunkingOptions,
  HeadingNode,
  ParagraphNode,
} from "@markitdownjs/shared";
import { walkAst, getNodeText, isNodeOfType, countTokens } from "@markitdownjs/shared";
import type { ChunkingStrategy } from "../chunker.js";
import { createChunk } from "../chunker.js";

const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP = 50;

/** Splits a document by semantic boundaries with configurable overlap */
export class SemanticChunkingStrategy implements ChunkingStrategy {
  name = "semantic";

  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const overlap = options.overlap ?? DEFAULT_OVERLAP;
    const nodes: AnyNode[] = [];

    walkAst(ast, (node, _parent) => {
      if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "list" ||
        node.type === "table" ||
        node.type === "code" ||
        node.type === "blockquote" ||
        node.type === "thematic-break" ||
        node.type === "horizontal-rule"
      ) {
        nodes.push(node);
      }
    });

    if (nodes.length === 0) return [];

    const semanticGroups = groupBySemanticBoundary(nodes);
    const chunks: DocumentChunk[] = [];
    let overlapText = "";

    for (const group of semanticGroups) {
      const groupTokens = group.reduce((sum, n) => sum + countTokens(n), 0);

      if (overlapText && overlap > 0) {
        const overlapWords = overlapText.split(/\s+/).filter(Boolean).slice(-overlap);
        const overlapToken = overlapWords.join(" ");
        if (overlapToken) {
          group.unshift({
            type: "paragraph",
            children: [{ type: "text", value: overlapToken }],
          } as ParagraphNode);
        }
      }

      if (groupTokens <= maxTokens) {
        const chunk = createChunk(group, extractHeadingPath(group), options, 0, groupTokens);
        if (chunk) chunks.push(chunk);
        const lastText = getNodeText(group[group.length - 1]!);
        const words = lastText.split(/\s+/).filter(Boolean);
        overlapText = words.slice(-overlap).join(" ");
      } else {
        const subChunks = splitGroupByTokens(group, maxTokens, overlap, options);
        chunks.push(...subChunks);
        if (subChunks.length > 0) {
          const lastChunk = subChunks[subChunks.length - 1]!;
          const words = lastChunk.content.split(/\s+/).filter(Boolean);
          overlapText = words.slice(-overlap).join(" ");
        }
      }
    }

    return chunks;
  }
}

function groupBySemanticBoundary(nodes: AnyNode[]): AnyNode[][] {
  const groups: AnyNode[][] = [];
  let currentGroup: AnyNode[] = [];

  for (const node of nodes) {
    if (isNodeOfType<HeadingNode>(node, "heading")) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(node);
    } else if (node.type === "thematic-break" || node.type === "horizontal-rule") {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    } else {
      currentGroup.push(node);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function extractHeadingPath(nodes: AnyNode[]): string[] {
  const path: string[] = [];
  for (const node of nodes) {
    if (isNodeOfType<HeadingNode>(node, "heading")) {
      path.length = node.level - 1;
      path[node.level - 1] = getNodeText(node);
    }
  }
  return path;
}

function splitGroupByTokens(
  nodes: AnyNode[],
  maxTokens: number,
  overlap: number,
  options: ChunkingOptions
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let buffer: AnyNode[] = [];
  let bufferTokens = 0;

  for (const node of nodes) {
    const nodeTokens = countTokens(node);

    if (bufferTokens + nodeTokens > maxTokens && buffer.length > 0) {
      const chunk = createChunk(buffer, extractHeadingPath(buffer), options, 0, bufferTokens);
      if (chunk) chunks.push(chunk);

      const lastText = getNodeText(buffer[buffer.length - 1]!);
      const overlapWords = lastText.split(/\s+/).filter(Boolean).slice(-overlap);
      const overlapToken = overlapWords.join(" ");

      buffer = [];
      bufferTokens = 0;

      if (overlapToken && overlap > 0) {
        buffer.push({
          type: "paragraph",
          children: [{ type: "text", value: overlapToken }],
        } as ParagraphNode);
        bufferTokens = overlap;
      }
    }

    buffer.push(node);
    bufferTokens += nodeTokens;
  }

  if (buffer.length > 0) {
    const chunk = createChunk(buffer, extractHeadingPath(buffer), options, 0, bufferTokens);
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}
