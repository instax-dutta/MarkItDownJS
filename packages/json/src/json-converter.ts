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
  type AnyNode,
  type HeadingNode,
  type CodeNode,
  type TableNode,
  type TableRowNode,
  type TableCellNode,
  type TextNode,
  type DocumentNode,
} from "@markitdownjs/shared";

export class JsonConverter implements Converter {
  readonly id = "json" as const;
  readonly supportedMimeTypes = ["application/json", "application/ld+json"];
  readonly supportedExtensions = [".json", ".jsonl"];

  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType) {
      if (this.supportedMimeTypes.includes(input.mimeType)) return true;
    }
    if (input.fileName) {
      const ext = this.getExtension(input.fileName);
      if (this.supportedExtensions.includes(ext)) return true;
    }
    if (typeof input.data === "string") {
      const trimmed = input.data.trimStart();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          JSON.parse(trimmed);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const text = await this.readString(input);
    const inputSize = new TextEncoder().encode(text).byteLength;

    const parsed = JSON.parse(text);
    const children: AnyNode[] = [];

    children.push(
      createNode<HeadingNode>({
        type: "heading",
        level: 2,
        children: [createNode<TextNode>({ type: "text", value: "JSON Data" })],
      })
    );

    const tableData: TableData | null = this.tryExtractTableData(parsed);

    if (tableData) {
      children.push(this.buildTableNode(tableData));
      const markdown = this.renderHeading() + "\n\n" + this.renderTableMarkdown(tableData);
      return this.buildResult(markdown, children, tableData, inputSize, startTime);
    }

    const prettyJson = JSON.stringify(parsed, null, 2);
    children.push(
      createNode<CodeNode>({
        type: "code",
        language: "json",
        value: prettyJson,
      })
    );

    const markdown = this.renderHeading() + "\n\n```json\n" + prettyJson + "\n```";
    return this.buildResult(markdown, children, null, inputSize, startTime);
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

  private renderHeading(): string {
    return "## JSON Data";
  }

  private tryExtractTableData(data: unknown): TableData | null {
    if (!Array.isArray(data)) return null;
    if (data.length === 0) return null;
    if (!data.every((item) => typeof item === "object" && item !== null && !Array.isArray(item)))
      return null;

    const keys = new Set<string>();
    for (const item of data) {
      for (const key of Object.keys(item as Record<string, unknown>)) {
        keys.add(key);
      }
    }

    const headers = Array.from(keys);
    const rows = data.map((item) =>
      headers.map((h) => {
        const val = (item as Record<string, unknown>)[h];
        return val === undefined || val === null
          ? ""
          : typeof val === "object"
            ? JSON.stringify(val)
            : String(val);
      })
    );

    return { headers, rows };
  }

  private buildTableNode(tableData: TableData): TableNode {
    const headerRow = createNode<TableRowNode>({
      type: "table-row",
      children: tableData.headers.map((h) =>
        createNode<TableCellNode>({
          type: "table-cell",
          children: [createNode<TextNode>({ type: "text", value: h })],
        })
      ),
      isHeader: true,
    });

    const dataRows = tableData.rows.map((row) =>
      createNode<TableRowNode>({
        type: "table-row",
        children: row.map((cell) =>
          createNode<TableCellNode>({
            type: "table-cell",
            children: [createNode<TextNode>({ type: "text", value: cell })],
          })
        ),
      })
    );

    return createNode<TableNode>({
      type: "table",
      children: [headerRow, ...dataRows],
    });
  }

  private renderTableMarkdown(tableData: TableData): string {
    const { headers, rows } = tableData;
    const colWidths = headers.map((h) => h.length);

    for (const row of rows) {
      for (let c = 0; c < row.length; c++) {
        if (c < colWidths.length) {
          colWidths[c] = Math.max(colWidths[c]!, row[c]!.length);
        }
      }
    }

    const lines: string[] = [];
    lines.push("| " + headers.map((h, i) => h.padEnd(colWidths[i]!)).join(" | ") + " |");
    lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |");
    for (const row of rows) {
      lines.push("| " + row.map((c, i) => c.padEnd(colWidths[i] ?? c.length)).join(" | ") + " |");
    }
    return lines.join("\n");
  }

  private buildResult(
    markdown: string,
    children: AnyNode[],
    tableData: TableData | null,
    inputSize: number,
    startTime: number
  ): ConversionResult {
    const documentNode = createNode<DocumentNode>({
      type: "document",
      children,
    });

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
      tables: tableData ? [tableData] : [],
      images: [],
      headings: [{ level: 2, text: "JSON Data" }],
      ast: documentNode,
      format: "markdown",
      converterId: this.id,
      stats,
    };
  }
}
