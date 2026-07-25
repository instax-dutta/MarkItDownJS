import { extensionToMime } from "./mime-types.js";

export function uint8ArrayToDataUrl(data: Uint8Array, mimeType: string): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function readInputData(
  input: Uint8Array | ArrayBuffer | Blob | string
): Promise<Uint8Array> {
  if (typeof input === "string") {
    return new TextEncoder().encode(input);
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  return blobToUint8Array(input);
}

export function detectMimeTypeFromData(data: Uint8Array): string | undefined {
  if (data.length < 4) return undefined;

  // PDF
  if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    return "application/pdf";
  }

  // ZIP-based formats (docx, xlsx, pptx, epub, jar, etc.)
  if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    return "application/zip";
  }

  // PNG
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }

  // JPEG
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP (RIFF....WEBP)
  if (
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data.length >= 12 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return "image/webp";
  }

  // GIF
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return "image/gif";
  }

  // BMP
  if (data[0] === 0x42 && data[1] === 0x4d) {
    return "image/bmp";
  }

  // TIFF (little-endian and big-endian)
  if (
    (data[0] === 0x49 && data[1] === 0x49 && data[2] === 0x2a && data[3] === 0x00) ||
    (data[0] === 0x4d && data[1] === 0x4d && data[2] === 0x00 && data[3] === 0x2a)
  ) {
    return "image/tiff";
  }

  // XML / HTML (text-based, starts with <?xml or <html or <htm)
  if (data.length >= 5) {
    const head = new TextDecoder("utf-8", { fatal: false }).decode(data.subarray(0, 256)).trim();
    if (head.startsWith("<?xml")) return "application/xml";
    if (head.startsWith("<html") || head.startsWith("<htm")) return "text/html";
  }

  // MP3 (ID3v2 tag)
  if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
    return "audio/mpeg";
  }

  // WAV (RIFF....WAVE)
  if (
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data.length >= 12 &&
    data[8] === 0x57 &&
    data[9] === 0x41 &&
    data[10] === 0x56 &&
    data[11] === 0x45
  ) {
    return "audio/wav";
  }

  // OGG (starts with "OggS")
  if (data[0] === 0x4f && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53) {
    return "audio/ogg";
  }

  // FLAC (starts with "fLaC")
  if (data[0] === 0x66 && data[1] === 0x4c && data[2] === 0x61 && data[3] === 0x43) {
    return "audio/flac";
  }

  return undefined;
}

/**
 * Detect MIME type from a buffer using magic bytes, falling back to
 * extension-based detection from the filename.
 *
 * @param data - The file content as a Uint8Array
 * @param fileName - Optional filename for extension-based fallback detection
 * @returns The detected MIME type, or undefined if detection fails
 */
export function detectMimeTypeFromBuffer(data: Uint8Array, fileName?: string): string | undefined {
  // First try magic-byte detection
  const fromMagic = detectMimeTypeFromData(data);
  if (fromMagic) return fromMagic;

  // Fall back to extension-based detection from filename
  if (fileName) {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex !== -1) {
      const ext = fileName.substring(dotIndex).toLowerCase();
      return extensionToMime(ext);
    }
  }

  return undefined;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function mergeOptions<T extends Record<string, unknown>>(
  defaults: T,
  overrides?: Partial<T>
): T {
  if (!overrides) return defaults;
  return { ...defaults, ...overrides };
}

export class AbortError extends Error {
  constructor(message = "Operation was aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export function checkSignal(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError();
  }
}
