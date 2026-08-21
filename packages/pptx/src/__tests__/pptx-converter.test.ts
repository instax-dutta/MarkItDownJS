import { describe, it, expect } from "vitest";
import {
  parseXML,
  type TableNode,
  type TableRowNode,
  type TableCellNode,
  type TextNode,
} from "@markitdownjs/shared";
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

  it("should reject bare ZIP bytes without mimeType or fileName", async () => {
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(await converter.canConvert({ data: zipHeader })).toBe(false);
  });

  it("should reject non-PPTX files", async () => {
    expect(await converter.canConvert({ data: "hello", fileName: "test.txt" })).toBe(false);
  });
});

describe("PptxConverter table extraction", () => {
  const converter = new PptxConverter();
  // extractTables is private; drive it directly with a parsed slide DOM.
  const extractTables = (doc: Document): TableNode[] =>
    (
      converter as unknown as {
        extractTables(d: Document): TableNode[];
      }
    ).extractTables(doc);

  it("extracts DrawingML tables (a:tbl/a:tr/a:tc) from a slide", async () => {
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:graphicFrame><a:graphic><a:graphicData>
      <a:tbl>
        <a:tr>
          <a:tc><a:txBody><a:p><a:r><a:t>Name</a:t></a:r></a:p></a:txBody></a:tc>
          <a:tc><a:txBody><a:p><a:r><a:t>Score</a:t></a:r></a:p></a:txBody></a:tc>
        </a:tr>
        <a:tr>
          <a:tc gridSpan="2"><a:txBody><a:p><a:r><a:t>Total</a:t></a:r></a:p></a:txBody></a:tc>
        </a:tr>
      </a:tbl>
    </a:graphicData></a:graphic></p:graphicFrame>
  </p:spTree></p:cSld>
</p:sld>`;
    const doc = await parseXML(slideXml);
    const tables = extractTables(doc);

    expect(tables).toHaveLength(1);
    const rows = tables[0].children as TableRowNode[];
    expect(rows).toHaveLength(2);
    expect(rows[0].isHeader).toBe(true);

    const headerCells = rows[0].children as TableCellNode[];
    expect(headerCells.map((c) => (c.children[0] as TextNode).value)).toEqual(["Name", "Score"]);

    const spannedCell = (rows[1].children as TableCellNode[])[0];
    expect((spannedCell.children[0] as TextNode).value).toBe("Total");
    expect(spannedCell.colspan).toBe(2);
  });
});
