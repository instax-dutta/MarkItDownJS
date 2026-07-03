import type { ConversionResult } from "@markitdownjs/shared";
import type { PackBundle, PackManifest, PackOptions } from "./types.js";

/**
 * Pack a ConversionResult into a portable bundle.
 * The bundle contains compressed chunks and metadata that can be restored anywhere.
 */
export async function pack(result: ConversionResult, options: PackOptions = {}): Promise<PackBundle> {
  const {
    compression: _compression = "none",
    includeAst = false,
    includeChunks = true,
    metadata,
  } = options;

  const chunks = result.chunks ?? [];

  // Build the payload data.
  const payloadData: Record<string, unknown> = {};
  if (includeChunks) {
    payloadData.chunks = chunks.map((c) => ({
      id: c.id,
      content: c.content,
      metadata: c.metadata,
      ast: includeAst ? c.ast : undefined,
    }));
  }
  if (includeAst && result.ast) {
    payloadData.ast = result.ast;
  }
  payloadData.markdown = result.markdown;
  payloadData.metadata = result.metadata;

  // Serialize to JSON.
  const json = JSON.stringify(payloadData);

  // Base64-encode (compression is reserved for future use).
  const payload = btoa(unescape(encodeURIComponent(json)));

  // Compute manifest.
  const totalTokens = chunks.reduce((sum, c) => sum + (c.metadata.tokenCount ?? 0), 0);
  const manifest: PackManifest = {
    chunkCount: chunks.length,
    tokenCount: totalTokens,
  };

  // Simple fingerprint from markdown content.
  let hash = 0;
  for (let i = 0; i < result.markdown.length; i++) {
    hash = ((hash << 5) - hash + result.markdown.charCodeAt(i)) | 0;
  }
  manifest.fingerprint = `djb2:${Math.abs(hash).toString(16).padStart(8, "0")}`;

  return {
    format: "markitdownjs-pack-v1",
    manifest,
    payload,
    metadata,
  };
}

/**
 * Unpack a PackBundle back into a ConversionResult-like object.
 */
export function unpack(bundle: PackBundle): {
  markdown: string;
  chunks: any[];
  metadata: Record<string, unknown>;
  ast?: any;
} {
  // Decode base64 payload.
  const json = decodeURIComponent(escape(atob(bundle.payload)));
  const data = JSON.parse(json);

  return {
    markdown: data.markdown ?? "",
    chunks: data.chunks ?? [],
    metadata: data.metadata ?? {},
    ast: data.ast,
  };
}
