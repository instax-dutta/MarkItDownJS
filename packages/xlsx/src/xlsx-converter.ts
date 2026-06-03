import type {
  Converter,
  ConversionInput,
  ConversionResult,
  HeadingInfo,
  TableData,
  AnyNode,
} from "@markitdownjs/shared";
import {
  createNode,
  parseXML,
  DocumentNode,
  HeadingNode,
  TextNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  SectionNode,
} from "@markitdownjs/shared";
import { MarkdownRenderer } from "@markitdownjs/ast";

interface SheetInfo {
  name: string;
  rid: string;
  index: number;
}

interface MergedCell {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface CellData {
  value: string;
  type: string;
  row: number;
  col: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type JSZipInstance = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Convert XLSX files to markdown via AST-first processing. */
export class XlsxConverter implements Converter {
  readonly id = "xlsx" as const;
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  readonly supportedExtensions = [".xlsx"];

  /**
   * Determine whether this converter can handle the given input.
   * @param input - The conversion input to inspect.
   * @returns True if the input is a supported XLSX.
   */
  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType && this.supportedMimeTypes.includes(input.mimeType)) {
      return true;
    }
    if (input.fileName) {
      const ext = input.fileName.toLowerCase();
      if (this.supportedExtensions.some((e) => ext.endsWith(e))) {
        return true;
      }
    }
    if (input.data instanceof Uint8Array || input.data instanceof ArrayBuffer) {
      const bytes =
        input.data instanceof Uint8Array
          ? input.data
          : new Uint8Array(input.data);
      if (
        bytes.length >= 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Convert an XLSX workbook into markdown via an AST intermediate.
   *
   * The converter uses JSZip to unpack the archive, parses the workbook for
   * sheet names, reads the shared string table, then processes every sheet
   * extracting cell data with proper type handling (string, number, boolean)
   * and merge cell support.
   *
   * @param input - The conversion input containing XLSX data.
   * @returns A complete ConversionResult with markdown, AST, and metadata.
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = Date.now();
    const data = await this.toByteArray(input.data);
    const JSZip = (await import("jszip")).default;
    const zip: JSZipInstance = await JSZip.loadAsync(data);
    const renderer = new MarkdownRenderer();

    const sharedStrings = await this.parseSharedStrings(zip);
    const sheets = await this.parseWorkbook(zip);

    const sectionNodes: AnyNode[] = [];
    const headings: HeadingInfo[] = [];
    const tables: TableData[] = [];

    for (const sheet of sheets) {
      const { cells, merges } = await this.parseSheet(zip, sheet.index, sharedStrings);
      if (cells.length === 0) continue;

      // Determine grid dimensions.
      let maxRow = 0;
      let maxCol = 0;
      for (const cell of cells) {
        if (cell.row > maxRow) maxRow = cell.row;
        if (cell.col > maxCol) maxCol = cell.col;
      }

      // Build a lookup map for quick cell access.
      const cellMap = new Map<string, CellData>();
      for (const cell of cells) {
        cellMap.set(`${cell.row},${cell.col}`, cell);
      }

      // Resolve merged cells: copy the top-left value into all merged positions.
      for (const merge of merges) {
        const topCell = cellMap.get(`${merge.startRow},${merge.startCol}`);
        if (!topCell) continue;
        for (let r = merge.startRow; r <= merge.endRow; r++) {
          for (let c = merge.startCol; c <= merge.endCol; c++) {
            if (r === merge.startRow && c === merge.startCol) continue;
            cellMap.set(`${r},${c}`, {
              value: topCell.value,
              type: topCell.type,
              row: r,
              col: c,
            });
          }
        }
        // Expand grid bounds.
        if (merge.endRow > maxRow) maxRow = merge.endRow;
        if (merge.endCol > maxCol) maxCol = merge.endCol;
      }

      // Build the grid.
      const grid: string[][] = [];
      for (let r = 0; r <= maxRow; r++) {
        const row: string[] = [];
        for (let c = 0; c <= maxCol; c++) {
          const cell = cellMap.get(`${r},${c}`);
          row.push(cell?.value ?? "");
        }
        grid.push(row);
      }

      if (grid.length === 0) continue;

      // Build AST: SectionNode > HeadingNode + TableNode.
      const sheetChildren: AnyNode[] = [];

      const headingNode = createNode<HeadingNode>({
        type: "heading",
        level: 2,
        children: [
          createNode<TextNode>({ type: "text", value: sheet.name }),
        ],
      });
      sheetChildren.push(headingNode);
      headings.push({ level: 2, text: sheet.name });

      // Build table from grid.
      const tableNode = this.buildTableFromGrid(grid);
      sheetChildren.push(tableNode);

      // Build TableData summary.
      const tableData = this.gridToTableData(grid);
      tables.push(tableData);

      sectionNodes.push(
        createNode<SectionNode>({
          type: "section",
          title: sheet.name,
          children: sheetChildren,
        })
      );
    }

    const ast = createNode<DocumentNode>({
      type: "document",
      children: sectionNodes,
    });
    const markdown = renderer.render(ast);
    const endTime = Date.now();

    return {
      markdown,
      metadata: {
        format:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        source: "jszip",
      },
      assets: [],
      tables,
      images: [],
      headings,
      ast,
      format: "markdown",
      converterId: this.id,
      stats: {
        startTime,
        endTime,
        duration: endTime - startTime,
        inputSize: data.length,
        outputSize: markdown.length,
      },
    };
  }

  /**
   * Parse xl/sharedStrings.xml to build the shared string index.
   *
   * @param zip - The JSZip archive of the XLSX.
   * @returns A Map from string index to string value.
   */
  private async parseSharedStrings(
    zip: JSZipInstance
  ): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    const xml = await zip.file("xl/sharedStrings.xml")?.async("string");
    if (!xml) return map;

    const doc = await parseXML(xml);
    const siElements = doc.getElementsByTagName("si");

    for (let i = 0; i < siElements.length; i++) {
      const siEl = siElements.item(i);
      if (!siEl) continue;
      const texts = siEl.getElementsByTagName("t");
      let value = "";
      for (let j = 0; j < texts.length; j++) {
        const tEl = texts.item(j);
        if (tEl) value += tEl.textContent ?? "";
      }
      map.set(i, value);
    }

    return map;
  }

  /**
   * Parse xl/workbook.xml to extract sheet names and their indices.
   *
   * @param zip - The JSZip archive of the XLSX.
   * @returns An array of SheetInfo objects with name, rid, and sheet index.
   */
  private async parseWorkbook(zip: JSZipInstance): Promise<SheetInfo[]> {
    const sheets: SheetInfo[] = [];
    const xml = await zip.file("xl/workbook.xml")?.async("string");
    if (!xml) return sheets;

    const doc = await parseXML(xml);
    const sheetEls = doc.getElementsByTagName("sheet");

    for (let i = 0; i < sheetEls.length; i++) {
      const sheetEl = sheetEls.item(i);
      if (!sheetEl) continue;
      const name = sheetEl.getAttribute("name") ?? `Sheet ${i + 1}`;
      const rid = sheetEl.getAttribute("r:id") ?? "";
      sheets.push({ name, rid, index: i + 1 });
    }

    return sheets;
  }

  /**
   * Parse xl/worksheets/sheetN.xml to extract cell data and merge ranges.
   *
   * @param zip - The JSZip archive of the XLSX.
   * @param sheetNumber - The 1-based sheet index.
   * @param sharedStrings - The shared string table.
   * @returns An object with cells and merges arrays.
   */
  private async parseSheet(
    zip: JSZipInstance,
    sheetNumber: number,
    sharedStrings: Map<number, string>
  ): Promise<{ cells: CellData[]; merges: MergedCell[] }> {
    const cells: CellData[] = [];
    const merges: MergedCell[] = [];

    const sheetPath = `xl/worksheets/sheet${sheetNumber}.xml`;
    const xml = await zip.file(sheetPath)?.async("string");
    if (!xml) return { cells, merges };

    const doc = await parseXML(xml);

    // Parse merge cells.
    const mergeCells = doc.getElementsByTagName("mergeCell");
    for (let i = 0; i < mergeCells.length; i++) {
      const mc = mergeCells.item(i);
      if (!mc) continue;
      const ref = mc.getAttribute("ref") ?? "";
      const match = ref.match(
        /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/
      );
      if (match) {
        merges.push({
          startCol: this.columnLetterToIndex(match[1]!),
          startRow: parseInt(match[2]!, 10) - 1,
          endCol: this.columnLetterToIndex(match[3]!),
          endRow: parseInt(match[4]!, 10) - 1,
        });
      }
    }

    // Parse sheet data.
    const sheetData = doc.getElementsByTagName("sheetData")[0];
    if (!sheetData) return { cells, merges };

    const rowEls = sheetData.getElementsByTagName("row");
    for (let i = 0; i < rowEls.length; i++) {
      const rowEl = rowEls.item(i);
      if (!rowEl) continue;

      const cellEls = rowEl.getElementsByTagName("c");
      for (let j = 0; j < cellEls.length; j++) {
        const cellEl = cellEls.item(j);
        if (!cellEl) continue;

        const ref = cellEl.getAttribute("r") ?? "";
        const type = cellEl.getAttribute("t") ?? "";
        const vEl = cellEl.getElementsByTagName("v")[0];
        let rawValue = vEl?.textContent ?? "";

        // Resolve shared strings.
        if (type === "s" && rawValue) {
          const index = parseInt(rawValue, 10);
          rawValue = sharedStrings.get(index) ?? rawValue;
        }

        // Handle boolean type.
        if (type === "b") {
          rawValue = rawValue === "1" ? "TRUE" : "FALSE";
        }

        // Parse cell position.
        const colMatch = ref.match(/^([A-Z]+)/);
        const rowMatch = ref.match(/(\d+)$/);
        if (!colMatch || !rowMatch) continue;

        const col = this.columnLetterToIndex(colMatch[1]!);
        const row = parseInt(rowMatch[1]!, 10) - 1;

        cells.push({
          value: rawValue,
          type,
          row,
          col,
        });
      }
    }

    return { cells, merges };
  }

  /**
   * Convert a column letter string to a zero-based index.
   *
   * Supports single letters (A-Z) and multi-character columns (AA, AB, etc.).
   *
   * @param col - The column letter(s).
   * @returns Zero-based column index.
   */
  private columnLetterToIndex(col: string): number {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /**
   * Build a TableNode from a 2D string grid.
   *
   * The first row is treated as the header row.
   *
   * @param grid - A 2D array of cell values.
   * @returns A TableNode AST node.
   */
  private buildTableFromGrid(grid: string[][]): TableNode {
    const rows: TableRowNode[] = [];

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r]!;
      const isHeader = r === 0;
      rows.push(
        createNode<TableRowNode>({
          type: "table-row",
          isHeader,
          children: row.map((cellValue) =>
            createNode<TableCellNode>({
              type: "table-cell",
              children: [
                createNode<TextNode>({ type: "text", value: cellValue }),
              ],
            })
          ),
        })
      );
    }

    return createNode<TableNode>({
      type: "table",
      children: rows,
    });
  }

  /**
   * Convert a 2D string grid into a TableData summary.
   *
   * @param grid - A 2D array of cell values.
   * @returns A TableData object.
   */
  private gridToTableData(grid: string[][]): TableData {
    if (grid.length === 0) return { headers: [], rows: [] };

    const headers = grid[0]!;
    const rows = grid.slice(1);
    return { headers, rows };
  }

  /**
   * Convert input data to a Uint8Array.
   * @param data - The input data in any supported format.
   * @returns The data as a Uint8Array.
   */
  private async toByteArray(
    data: Uint8Array | ArrayBuffer | Blob | string
  ): Promise<Uint8Array> {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    return new TextEncoder().encode(data);
  }
}
