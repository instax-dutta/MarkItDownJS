/** Compression type for the pack payload */
export type PackCompression = "none" | "gzip" | "brotli";

/** Manifest for a packed bundle */
export interface PackManifest {
  /** Total number of chunks */
  chunkCount: number;
  /** Total token count across all chunks */
  tokenCount: number;
  /** Token reduction percentage vs raw text */
  reduction?: string;
  /** Content fingerprint for dedup */
  fingerprint?: string;
}

/** Configuration for packing */
export interface PackOptions {
  /** Compression algorithm (default: "none") */
  compression?: PackCompression;
  /** Include the full AST in the bundle (default: false for smaller payload) */
  includeAst?: boolean;
  /** Include chunks in the bundle (default: true) */
  includeChunks?: boolean;
  /** Optional metadata to embed in the manifest */
  metadata?: Record<string, unknown>;
}

/** A portable bundle produced by pack() */
export interface PackBundle {
  /** Format identifier */
  format: "markitdownjs-pack-v1";
  /** Manifest with summary stats */
  manifest: PackManifest;
  /** Base64-encoded compressed payload */
  payload: string;
  /** Embedded metadata */
  metadata?: Record<string, unknown>;
}
