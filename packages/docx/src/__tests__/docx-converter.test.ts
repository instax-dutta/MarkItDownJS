import { describe, it, expect } from "vitest";
import { DocxConverter } from "../docx-converter.js";

describe("DocxConverter", () => {
  const converter = new DocxConverter();

  it("should detect DOCX by MIME type", async () => {
    expect(
      await converter.canConvert({
        data: "",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toBe(true);
  });

  it("should detect DOCX by extension", async () => {
    expect(await converter.canConvert({ data: "", fileName: "test.docx" })).toBe(true);
  });

  it("should NOT match bare ZIP bytes without mimeType/fileName (strict dispatch)", async () => {
    // ZIP magic is shared by .docx/.xlsx/.pptx/.epub; strict mode refuses to guess.
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(await converter.canConvert({ data: zipHeader })).toBe(false);
  });

  it("should reject non-DOCX files", async () => {
    expect(await converter.canConvert({ data: "hello", fileName: "test.txt" })).toBe(false);
  });

  it("should throw for invalid DOCX data (no word/document.xml)", async () => {
    const invalidDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    await expect(
      converter.convert({
        data: invalidDocx,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).rejects.toThrow();
  });
});
