import type { ConversionInput, FileExtension, MimeType } from "./types.js";
import { ConversionError } from "./errors.js";

export interface StrictCanConvertOptions {
  /** MIME types this converter handles. */
  mimeTypes: readonly MimeType[];
  /** File extensions this converter handles (including leading dot, lowercase). */
  extensions: readonly FileExtension[];
  /**
   * Optional magic-byte check. Only invoked when neither mimeType nor fileName is provided.
   * Omit for formats whose magic bytes overlap with other formats (e.g. all ZIP-based OOXML).
   */
  magicBytes?: (bytes: Uint8Array) => boolean;
}

/**
 * Strict canConvert decision tree.
 *
 *   1. If `input.mimeType` is provided, match-or-reject (no fall-through).
 *   2. If `input.fileName` is provided, match-or-reject (no fall-through).
 *   3. Only when neither hint is provided, fall back to magic-byte sniffing (if `magicBytes`).
 *
 * This prevents zip-based converters (docx/xlsx/pptx/epub) from intercepting each other
 * via the shared `PK\x03\x04` ZIP magic header when the caller has already specified the type.
 */
export async function strictCanConvert(
  input: ConversionInput,
  opts: StrictCanConvertOptions
): Promise<boolean> {
  if (input.mimeType) {
    return opts.mimeTypes.includes(input.mimeType);
  }

  if (input.fileName) {
    const dotIndex = input.fileName.lastIndexOf(".");
    if (dotIndex === -1) return false;
    const ext = input.fileName.slice(dotIndex).toLowerCase() as FileExtension;
    return opts.extensions.includes(ext);
  }

  if (opts.magicBytes) {
    if (input.data instanceof Uint8Array) {
      return opts.magicBytes(input.data);
    }
    if (input.data instanceof ArrayBuffer) {
      return opts.magicBytes(new Uint8Array(input.data));
    }
    if (typeof Blob !== "undefined" && input.data instanceof Blob) {
      const buf = await input.data.arrayBuffer();
      return opts.magicBytes(new Uint8Array(buf));
    }
  }

  return false;
}

/** Convenience magic-byte predicate for ZIP-based formats (`PK\x03\x04`). */
export function isZipMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/**
 * Guard against zip-bomb attacks by summing uncompressed entry sizes.
 *
 * Call immediately after `JSZip.loadAsync()`. Throws `ConversionError` when
 * total decompressed bytes exceed `limitBytes` (default 50 MB).
 */
export function checkZipBombRisk(
  zip: { forEach(cb: (path: string, file: unknown) => void): void },
  limitBytes = 52_428_800
): void {
  let total = 0;
  zip.forEach((_path: string, entry: unknown) => {
    const size =
      ((entry as Record<string, unknown>)._data as Record<string, number> | undefined)
        ?.uncompressedSize ?? 0;
    total += size;
    if (total > limitBytes) {
      throw new ConversionError(
        `Archive decompressed size exceeds limit of ${limitBytes} bytes (zip bomb protection)`,
        "zip-bomb-guard"
      );
    }
  });
}
