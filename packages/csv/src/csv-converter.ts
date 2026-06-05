import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
  DocumentMetadata,
  TableData,
} from "@markitdownjs/shared";
import {
  createNode,
  type TableNode,
  type TableRowNode,
  type TableCellNode,
  type TextNode,
  type DocumentNode,
} from "@markitdownjs/shared";

export class CsvConverter implements Converter {
  readonly id = "csv" as const;
  readonly supportedMimeTypes = ["text/csv", "text/tab-separated-values"];
  readonly supportedExtensions = [".csv", ".tsv"];

  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType) {
      if (this.supportedMimeTypes.includes(input.mimeType)) return true;
    }
    if (input.fileName) {
      const ext = this.getExtension(input.fileName);
      if (this.supportedExtensions.includes(ext)) return true;
    }
    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const text = await this.readString(input);
    const inputSize = new TextEncoder().encode(text).byteLength;

    const isTsv = this.detectTsv(input);
    const delimiter = isTsv ? "\t" : ",";
    const rows = this.parseCsv(text, delimiter);

    const tableData: TableData = {
      headers: rows[0] ?? [],
      rows: rows.slice(1),
    };

    const tableNode = this.buildTableNode(rows);
    const documentNode = createNode<DocumentNode>({
      type: "document",
      children: [tableNode],
    });

    const markdown = this.renderTableMarkdown(rows);
    const endTime = performance.now();
    const stats: ConversionStats = {
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize,
      outputSize: new TextEncoder().encode(markdown).byteLength,
    };

    const metadata: DocumentMetadata = {
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
    };

    return {
      markdown,
      metadata,
      assets: [],
      tables: [tableData],
      images: [],
      headings: [],
      ast: documentNode,
      format: "markdown",
      converterId: this.id,
      stats,
    };
  }

  private async readString(input: ConversionInput): Promise<string> {
    if (typeof input.data === "string") return input.data;
    const bytes =
      input.data instanceof Uint8Array
        ? input.data
        : input.data instanceof ArrayBuffer
          ? new Uint8Array(input.data)
          : new Uint8Array(await input.data.arrayBuffer());
    return new TextDecoder().decode(bytes);
  }

  private getExtension(fileName: string): string {
    const idx = fileName.lastIndexOf(".");
    return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
  }

  private detectTsv(input: ConversionInput): boolean {
    if (input.mimeType === "text/tab-separated-values") return true;
    if (input.fileName) {
      return this.getExtension(input.fileName) === ".tsv";
    }
    return false;
  }

  private parseCsv(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const ch = text[i]!;

      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          field += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === delimiter) {
          current.push(field);
          field = "";
          i++;
        } else if (ch === "\r") {
          current.push(field);
          field = "";
          rows.push(current);
          current = [];
          i++;
          if (i < text.length && text[i] === "\n") i++;
        } else if (ch === "\n") {
          current.push(field);
          field = "";
          rows.push(current);
          current = [];
          i++;
        } else {
          field += ch;
          i++;
        }
      }
    }

    if (field || current.length > 0) {
      current.push(field);
      rows.push(current);
    }

    return rows.filter((row) => row.some((f) => f.trim() !== ""));
  }

  private buildTableNode(rows: string[][]): TableNode {
    const tableRows: TableRowNode[] = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]!;
      const cells: TableCellNode[] = [];
      for (const field of row) {
        cells.push(
          createNode<TableCellNode>({
            type: "table-cell",
            children: [createNode<TextNode>({ type: "text", value: field })],
          })
        );
      }
      tableRows.push(
        createNode<TableRowNode>({
          type: "table-row",
          children: cells,
          isHeader: r === 0,
        })
      );
    }
    return createNode<TableNode>({
      type: "table",
      children: tableRows,
    });
  }

  private renderTableMarkdown(rows: string[][]): string {
    if (rows.length === 0) return "";
    const header = rows[0]!;
    const colWidths = header.map((h) => h.length);

    for (let r = 1; r < rows.length; r++) {
      for (let c = 0; c < rows[r]!.length; c++) {
        if (c < colWidths.length) {
          colWidths[c] = Math.max(colWidths[c]!, rows[r]![c]!.length);
        }
      }
    }

    const lines: string[] = [];
    const headerLine = "| " + header.map((h, i) => h.padEnd(colWidths[i]!)).join(" | ") + " |";
    lines.push(headerLine);
    lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |");

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!;
      const line = "| " + row.map((c, i) => c.padEnd(colWidths[i] ?? c.length)).join(" | ") + " |";
      lines.push(line);
    }

    return lines.join("\n");
  }
}
