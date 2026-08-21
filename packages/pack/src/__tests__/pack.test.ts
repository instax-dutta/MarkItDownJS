import { describe, it, expect } from "vitest";
import { pack, unpack } from "../pack.js";
import type { PackBundle } from "../types.js";
import type { ConversionResult } from "@markitdownjs/shared";

function createResult(markdown: string): ConversionResult {
  return {
    markdown,
    metadata: { title: "Test" },
    assets: [],
    tables: [],
    images: [],
    headings: [],
    format: "markdown",
    converterId: "test",
    stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
    ast: {
      type: "document",
      children: [{ type: "paragraph", children: [{ type: "text", value: markdown }] }],
    },
  };
}

describe("pack", () => {
  it("round-trips Unicode markdown", async () => {
    const markdown = "# héllo wörld — ✓ 😀 中文\n\nPara gráfo";
    const bundle = await pack(createResult(markdown));
    const restored = unpack(bundle);
    expect(restored.markdown).toBe(markdown);
  });

  it("rejects the unsupported gzip compression option", async () => {
    await expect(pack(createResult("hello"), { compression: "gzip" })).rejects.toThrow(
      /compression/i
    );
  });

  it("rejects the unsupported brotli compression option", async () => {
    await expect(pack(createResult("hello"), { compression: "brotli" })).rejects.toThrow(
      /compression/i
    );
  });
});

describe("unpack", () => {
  it("rejects a bundle with an unknown format", () => {
    const bundle = {
      format: "other-format",
      manifest: { chunkCount: 0, tokenCount: 0 },
      payload: "",
    } as unknown as PackBundle;

    expect(() => unpack(bundle)).toThrow(/format/i);
  });

  it("rejects a malformed base64 payload", () => {
    const bundle: PackBundle = {
      format: "markitdownjs-pack-v1",
      manifest: { chunkCount: 0, tokenCount: 0 },
      payload: "%%%not-valid-base64%%%",
    };

    expect(() => unpack(bundle)).toThrow(/payload|base64/i);
  });

  it("rejects malformed JSON inside a valid payload", () => {
    const bundle: PackBundle = {
      format: "markitdownjs-pack-v1",
      manifest: { chunkCount: 0, tokenCount: 0 },
      // base64 of the string "not json", which is not valid JSON
      payload: btoa("not json"),
    };

    expect(() => unpack(bundle)).toThrow(/payload|json/i);
  });
});
