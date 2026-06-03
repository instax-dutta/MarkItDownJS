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

  if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    return "application/pdf";
  }
  if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    return "application/zip";
  }
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
    return "image/webp";
  }
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return "image/gif";
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
