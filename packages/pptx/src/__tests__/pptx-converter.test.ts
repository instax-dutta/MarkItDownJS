import { describe, it, expect } from "vitest";
import { PptxConverter } from "../pptx-converter.js";

describe("PptxConverter", () => {
  const converter = new PptxConverter();

  it("should detect PPTX by MIME type", async () => {
    expect(
      await converter.canConvert({
        data: "",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      })
    ).toBe(true);
  });

  it("should detect PPTX by extension", async () => {
    expect(await converter.canConvert({ data: "", fileName: "slides.pptx" })).toBe(true);
  });

  it("should detect PPTX by PK magic bytes (ZIP)", async () => {
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(await converter.canConvert({ data: zipHeader })).toBe(true);
  });

  it("should reject non-PPTX files", async () => {
    expect(await converter.canConvert({ data: "hello", fileName: "test.txt" })).toBe(false);
  });
});
