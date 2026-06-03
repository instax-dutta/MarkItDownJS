import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
  TableData,
  AnyNode,
} from "@markitdownjs/shared";
import { createNode, readInputData } from "@markitdownjs/shared";
import JSZip from "jszip";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export class ArchiveConverter implements Converter {
  readonly id = "archive";
  readonly supportedMimeTypes = ["application/zip"];
  readonly supportedExtensions = [".zip"];

  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType && this.supportedMimeTypes.includes(input.mimeType)) {
      return true;
    }

    if (input.fileName) {
      const ext = input.fileName.slice(input.fileName.lastIndexOf(".")).toLowerCase();
      if (this.supportedExtensions.includes(ext)) {
        return true;
      }
    }

    try {
      const data = await readInputData(input.data);
      if (data.length >= 4) {
        const isZip =
          data[0] === 0x50 &&
          data[1] === 0x4b &&
          data[2] === 0x03 &&
          data[3] === 0x04;
        if (isZip) return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const data = await readInputData(input.data);

    const zip = await JSZip.loadAsync(data);
    const entries: Array<{ path: string; size: number; type: "File" | "Directory" }> = [];

    const processEntries: Promise<void>[] = [];
    zip.forEach((relativePath, zipEntry) => {
      const isDir = zipEntry.dir;
      if (isDir) {
        entries.push({ path: relativePath, size: 0, type: "Directory" });
      } else {
        processEntries.push(
          zipEntry.async("uint8array").then((data) => {
            entries.push({ path: relativePath, size: data.length, type: "File" });
          })
        );
      }
    });
    await Promise.all(processEntries);

    entries.sort((a, b) => a.path.localeCompare(b.path));

    const fileCount = entries.filter((e) => e.type === "File").length;
    const dirCount = entries.filter((e) => e.type === "Directory").length;

    const tableData: TableData = {
      headers: ["Path", "Size", "Type"],
      rows: entries.map((entry) => [
        entry.path,
        entry.type === "Directory" ? "-" : formatSize(entry.size),
        entry.type,
      ]),
      caption: `Archive contents: ${fileCount} file(s), ${dirCount} directory(ies)`,
    };

    const headerRow: AnyNode[] = tableData.headers.map((h) =>
      createNode({
        type: "table-cell" as const,
        children: [createNode({ type: "text" as const, value: h })],
      })
    );

    const tableRows: AnyNode[] = [
      createNode({
        type: "table-row" as const,
        children: headerRow,
        isHeader: true,
      }),
      ...tableData.rows.map(
        (row) =>
          createNode({
            type: "table-row" as const,
            children: row.map((cell) =>
              createNode({
                type: "table-cell" as const,
                children: [createNode({ type: "text" as const, value: cell })],
              })
            ),
          })
      ),
    ];

    const tableNode = createNode({
      type: "table" as const,
      children: tableRows as any,
      caption: tableData.caption,
    });

    const headingNode = createNode({
      type: "heading" as const,
      level: 1 as const,
      children: [createNode({ type: "text" as const, value: "Archive Contents" })],
    });

    const countNode = createNode({
      type: "paragraph" as const,
      children: [
        createNode({
          type: "text" as const,
          value: `${fileCount} file(s), ${dirCount} directory(ies)`,
        }),
      ],
    });

    const documentNode = createNode({
      type: "document" as const,
      children: [headingNode, countNode, tableNode],
    });

    const markdownLines: string[] = [
      "# Archive Contents",
      "",
      `${fileCount} file(s), ${dirCount} directory(ies)`,
      "",
      "| Path | Size | Type |",
      "| --- | --- | --- |",
      ...entries.map(
        (entry) =>
          `| ${entry.path} | ${entry.type === "Directory" ? "-" : formatSize(entry.size)} | ${entry.type} |`
      ),
    ];

    const markdown = markdownLines.join("\n");

    const endTime = performance.now();
    const stats: ConversionStats = {
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize: data.length,
      outputSize: markdown.length,
    };

    return {
      markdown,
      metadata: {},
      assets: [],
      tables: [tableData],
      images: [],
      headings: [{ level: 1, text: "Archive Contents" }],
      ast: documentNode,
      format: "markdown",
      converterId: this.id,
      stats,
    };
  }
}
