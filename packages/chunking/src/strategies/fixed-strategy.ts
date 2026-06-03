import type {
  AnyNode,
  DocumentChunk,
  ChunkingOptions,
  ParagraphNode,
  TextNode,
} from "@markitdownjs/shared";
import { getNodeText } from "@markitdownjs/shared";
import type { ChunkingStrategy } from "../chunker.js";

const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP = 50;

/** Splits a document into fixed-size chunks with overlap */
export class FixedChunkingStrategy implements ChunkingStrategy {
  name = "fixed";

  chunk(ast: AnyNode, options: ChunkingOptions): DocumentChunk[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const overlap = options.overlap ?? DEFAULT_OVERLAP;

    const text = getNodeText(ast);
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length === 0) return [];

    const chunks: DocumentChunk[] = [];
    let startIdx = 0;
    let globalOffset = 0;

    while (startIdx < words.length) {
      const endIdx = Math.min(startIdx + maxTokens, words.length);
      const chunkWords = words.slice(startIdx, endIdx);
      const content = chunkWords.join(" ");
      const tokenCount = chunkWords.length;

      const astNode = buildChunkAst(content);

      const chunk: DocumentChunk = {
        id: crypto.randomUUID(),
        content,
        metadata: {
          chunkId: crypto.randomUUID(),
          headingPath: [],
          tokenCount,
          sourceFile: options.sourceFile,
          startIndex: globalOffset,
          endIndex: globalOffset + tokenCount,
        },
        ast: astNode,
      };

      chunks.push(chunk);

      globalOffset += tokenCount;
      startIdx = endIdx - overlap;

      if (startIdx >= endIdx) break;
      if (startIdx >= words.length) break;
      if (endIdx >= words.length) break;
    }

    return chunks;
  }
}

function buildChunkAst(text: string): AnyNode {
  return {
    type: "paragraph",
    children: [{ type: "text", value: text } as TextNode],
  } as ParagraphNode;
}
