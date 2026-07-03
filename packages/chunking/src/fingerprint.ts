import type { AnyNode, DocumentChunk } from "@markitdownjs/shared";

/** Fingerprint for deduplication */
export interface ChunkFingerprint {
  /** Hash of normalized content (lowercase, whitespace-collapsed) */
  contentHash: string;
  /** Hash of AST structure (node types only, no content) */
  structureHash: string;
}

/**
 * Simple deterministic hash using DJB2 algorithm.
 * Produces a 32-bit hex string — sufficient for deduplication fingerprints.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Compute a stable content hash for a chunk.
 * Normalizes the content by lowercasing and collapsing whitespace before hashing.
 */
export function computeContentHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return `djb2:${djb2Hash(normalized)}`;
}

/**
 * Compute a structure hash for an AST node.
 * Hashes only the node types (not content), so reformatting doesn't change the hash.
 */
export function computeStructureHash(node: AnyNode): string {
  const types = collectNodeTypes(node);
  const typeString = types.join(",");
  return `djb2:${djb2Hash(typeString)}`;
}

/**
 * Collect all node types in order from an AST tree.
 */
function collectNodeTypes(node: AnyNode): string[] {
  const types: string[] = [node.type];
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      types.push(...collectNodeTypes(child));
    }
  }
  return types;
}

/**
 * Compute fingerprints for all chunks.
 * Returns the chunks with fingerprint metadata attached.
 */
export function fingerprintChunks(chunks: DocumentChunk[]): (DocumentChunk & { fingerprint: ChunkFingerprint })[] {
  return chunks.map((chunk) => ({
    ...chunk,
    fingerprint: {
      contentHash: computeContentHash(chunk.content),
      structureHash: computeStructureHash(chunk.ast),
    },
  }));
}

/**
 * Detect which chunks have changed between two versions.
 * Returns the indices of changed chunks.
 */
export function detectChangedChunks(
  oldChunks: { fingerprint: ChunkFingerprint }[],
  newChunks: { fingerprint: ChunkFingerprint }[]
): number[] {
  const changed: number[] = [];
  const maxLen = Math.max(oldChunks.length, newChunks.length);

  for (let i = 0; i < maxLen; i++) {
    const oldFp = oldChunks[i]?.fingerprint;
    const newFp = newChunks[i]?.fingerprint;

    if (!oldFp || !newFp) {
      changed.push(i);
    } else if (oldFp.contentHash !== newFp.contentHash || oldFp.structureHash !== newFp.structureHash) {
      changed.push(i);
    }
  }

  return changed;
}
