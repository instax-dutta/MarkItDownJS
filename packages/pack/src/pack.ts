import type { AnyNode, ConversionResult } from "@markitdownjs/shared";
import type { PackBundle, PackManifest, PackOptions, PackedData, PackedChunk } from "./types.js";

/** Package-specific error for invalid bundles or unsupported options. */
export class PackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackError";
  }
}

const PACK_FORMAT = "markitdownjs-pack-v1";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function encodeUtf8(text: string): Uint8Array {
  return encoder.encode(text);
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return decoder.decode(bytes);
  } catch {
    throw new PackError("Invalid UTF-8 payload");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new PackError("Invalid base64 payload");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Pack a ConversionResult into a portable bundle.
 * The bundle contains chunks and metadata that can be restored anywhere.
 */
export async function pack(
  result: ConversionResult,
  options: PackOptions = {}
): Promise<PackBundle> {
  const { includeAst = false, includeChunks = true, metadata, compression = "none" } = options;

  if (compression !== "none") {
    throw new PackError(
      `Unsupported compression: "${compression}". Only "none" is currently supported.`
    );
  }

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

  // Serialize to JSON and encode as UTF-8 → base64.
  const json = JSON.stringify(payloadData);
  const payload = bytesToBase64(encodeUtf8(json));

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
    format: PACK_FORMAT,
    manifest,
    payload,
    metadata,
  };
}

/**
 * Unpack a PackBundle back into typed packed data.
 */
export function unpack(bundle: PackBundle): PackedData {
  if (bundle.format !== PACK_FORMAT) {
    throw new PackError(`Unknown pack format: "${String(bundle.format)}"`);
  }

  const bytes = base64ToBytes(bundle.payload);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(decodeUtf8(bytes)) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof PackError) throw error;
    throw new PackError(
      `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const chunks = (data.chunks ?? []) as PackedChunk[];

  return {
    markdown: typeof data.markdown === "string" ? data.markdown : "",
    chunks,
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
    ast: data.ast as AnyNode | undefined,
  };
}
