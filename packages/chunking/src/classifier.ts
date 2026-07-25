import type { AnyNode, DocumentChunk } from "@markitdownjs/shared";

/** Content type classification for chunks */
export type ContentType = "narrative" | "table" | "code" | "list" | "callout" | "heading-only" | "mixed";

/**
 * Classify a chunk's content type based on its AST children.
 * Different content types benefit from different embedding strategies:
 * - "table": structured data → may need special table-aware embeddings
 * - "code": source code → code-specific embeddings
 * - "narrative": prose paragraphs → general text embeddings
 * - "list": enumerated items → may need list-aware handling
 * - "callout": notes/warnings → distinct semantic treatment
 * - "heading-only": pure structural markers → low embedding value
 * - "mixed": combination of types
 */
export function classifyChunkContentType(chunk: DocumentChunk): ContentType {
  const types = new Set<ContentType>();

  collectNodeTypes(chunk.ast, types);

  // Remove "narrative" from the set if other specific types are present,
  // since narrative is the fallback/default.
  if (types.size > 1) {
    types.delete("narrative");
  }

  // Single type → return it directly.
  if (types.size === 1) {
    return Array.from(types)[0]!;
  }

  // Multiple types → "mixed".
  if (types.size > 1) {
    return "mixed";
  }

  // No types found → "narrative" as default.
  return "narrative";
}

/**
 * Recursively collect content types from AST nodes.
 */
function collectNodeTypes(node: AnyNode, types: Set<ContentType>): void {
  switch (node.type) {
    case "table":
      types.add("table");
      break;
    case "code":
      types.add("code");
      break;
    case "list":
    case "list-item":
      types.add("list");
      break;
    case "callout":
      types.add("callout");
      break;
    case "heading":
      types.add("heading-only");
      break;
    case "paragraph":
    case "text":
      types.add("narrative");
      break;
  }

  // Recurse into children.
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectNodeTypes(child, types);
    }
  }
}

/**
 * Classify all chunks in an array and populate their contentType metadata.
 */
export function classifyChunks(chunks: DocumentChunk[]): DocumentChunk[] {
  return chunks.map((chunk) => {
    const contentType = classifyChunkContentType(chunk);
    return {
      ...chunk,
      metadata: {
        ...chunk.metadata,
        contentType,
      },
    };
  });
}
