import type { ConversionInput, ConversionResult } from "@markitdownjs/shared";

/** Input accepted by a MarkItDown-compatible parser's `convert` method. */
export type ParserInput = ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string;

/**
 * Minimal structural interface for the MarkItDown parser, so the Next.js
 * integration does not depend on `@markitdownjs/core` at runtime. Any
 * `MarkItDown` instance satisfies this interface.
 */
export interface MarkItDownParser {
  convert(input: ParserInput): Promise<ConversionResult>;
}
