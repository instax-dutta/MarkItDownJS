import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionWarning,
  HeadingInfo,
  TableData,
  AnyNode,
} from "@markitdownjs/shared";
import {
  createNode,
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  PageBreakNode,
  TableNode,
  TableRowNode,
  TableCellNode,
} from "@markitdownjs/shared";
import { MarkdownRenderer } from "@markitdownjs/ast";

interface TextItem {
  str: string;
  transform: number[];
  fontSize: number;
}

interface ColumnGroup {
  xMin: number;
  xMax: number;
  items: TextItem[];
}

/** Minimum text items per page to consider a PDF as having a text layer */
const SCANNED_PDF_THRESHOLD = 5;

/** Minimum x-gap (in PDF units) to consider items as separate columns */
const COLUMN_GAP_THRESHOLD = 50;

/** Convert PDF files to markdown via AST-first processing. */
export class PdfConverter implements Converter {
  readonly id = "pdf" as const;
  readonly supportedMimeTypes = ["application/pdf"];
  readonly supportedExtensions = [".pdf"];

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
      const bytes = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data);
      if (
        bytes.length >= 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
      ) {
        return true;
      }
    }
    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = Date.now();
    const data = await this.toByteArray(input.data);
    const renderer = new MarkdownRenderer();
    const opts = input.options ?? {};
    const ratios = opts.headingSizeRatios ?? {};
    const warnings: ConversionWarning[] = [];

    let ast: DocumentNode;
    let markdown: string;
    const headings: HeadingInfo[] = [];
    const tables: TableData[] = [];
    let pageCount = 0;
    let pdfTitle = "";
    let pdfAuthor = "";

    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const loadingTask = pdfjsLib.getDocument({
        data,
        isEvalSupported: false,
        ...(typeof Worker === "undefined" ? { disableWorker: true } : {}),
      } as Parameters<typeof pdfjsLib.getDocument>[0]);
      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages;

      try {
        const meta = await pdf.getMetadata();
        const info = (meta?.info ?? {}) as Record<string, unknown>;
        pdfTitle = typeof info.Title === "string" ? info.Title : "";
        pdfAuthor = typeof info.Author === "string" ? info.Author : "";
      } catch {
        // Metadata is best-effort.
      }

      const pageNodes: AnyNode[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const annotations = await page.getAnnotations();

        // Collect text items with positional data.
        const textItems: TextItem[] = [];
        for (const item of textContent.items) {
          if (!("str" in item) || !item.str) continue;
          textItems.push({
            str: item.str,
            transform: (item as any).transform ?? [1, 0, 0, 1, 0, 0],
            fontSize: this.extractFontSize(item as Record<string, unknown>),
          });
        }

        // Scanned PDF detection: check text density on first page.
        if (pageNum === 1 && textItems.length < SCANNED_PDF_THRESHOLD) {
          warnings.push({
            converter: this.id,
            message: `Page 1 has only ${textItems.length} text items — this may be a scanned/image PDF. Consider using @markitdownjs/image-ocr for better results.`,
            severity: "warning",
          });
        }

        // Collect font sizes for heading classification.
        const fontSizes = new Map<number, number>();
        for (const item of textItems) {
          if (item.fontSize > 0) {
            fontSizes.set(item.fontSize, (fontSizes.get(item.fontSize) ?? 0) + 1);
          }
        }

        let bodyFontSize = 0;
        let maxCount = 0;
        for (const [size, count] of fontSizes) {
          if (count > maxCount) {
            maxCount = count;
            bodyFontSize = size;
          }
        }

        // Build a link map from annotations.
        const linkMap = new Map<string, string>();
        for (const annot of annotations) {
          if (annot.subtype === "Link" && annot.url) {
            const rect = annot.rect;
            const key = `${Math.round(rect[0])},${Math.round(rect[1])},${Math.round(rect[2])},${Math.round(rect[3])}`;
            linkMap.set(key, annot.url);
          }
        }

        // Detect multi-column layout.
        const columns = this.detectColumns(textItems);

        if (columns.length > 1) {
          // Multi-column: process each column's items in reading order.
          for (const col of columns) {
            const colNodes = this.processTextItems(
              col.items,
              bodyFontSize,
              ratios,
              headings,
              linkMap
            );
            pageNodes.push(...colNodes);
          }
        } else {
          // Single column: original behavior.
          const colNodes = this.processTextItems(
            textItems,
            bodyFontSize,
            ratios,
            headings,
            linkMap
          );
          pageNodes.push(...colNodes);
        }

        // Detect and emit tables if grid-aligned text is found.
        const detectedTables = this.detectTables(textItems);
        for (const tableData of detectedTables) {
          tables.push(tableData);
          const tableNode = this.buildTableNode(tableData);
          if (tableNode) {
            pageNodes.push(tableNode);
          }
        }

        if (pageNum < pdf.numPages) {
          pageNodes.push(
            createNode<PageBreakNode>({
              type: "page-break",
              pageNumber: pageNum,
            })
          );
        }
      }

      ast = createNode<DocumentNode>({
        type: "document",
        children: pageNodes,
      });

      markdown = renderer.render(ast);

      if (opts.pageBreakMarker) {
        markdown = markdown.replace(/\n\n---\n\n/g, `\n\n${opts.pageBreakMarker}\n\n`);
      }
      if (opts.injectFrontmatter) {
        const fm: string[] = ["---"];
        const yamlEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        if (pdfTitle) fm.push(`title: "${yamlEscape(pdfTitle)}"`);
        if (pdfAuthor) fm.push(`author: "${yamlEscape(pdfAuthor)}"`);
        fm.push(`pages: ${pageCount}`);
        fm.push("---");
        markdown = fm.join("\n") + "\n\n" + markdown;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({
        converter: this.id,
        message: `PDF parsing failed: ${message}`,
        severity: "error",
      });

      ast = createNode<DocumentNode>({
        type: "document",
        children: [
          createNode<ParagraphNode>({
            type: "paragraph",
            children: [
              createNode<TextNode>({
                type: "text",
                value: "[PDF content could not be extracted]",
              }),
            ],
          }),
        ],
      });
      markdown = renderer.render(ast);
    }

    const endTime = Date.now();

    return {
      markdown,
      metadata: {
        pageCount,
        ...(pdfTitle && { title: pdfTitle }),
        ...(pdfAuthor && { author: pdfAuthor }),
        format: "application/pdf",
        source: "pdfjs-dist",
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
        pagesProcessed: pageCount,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Detect multi-column layout by clustering text items by x-coordinate.
   * Returns column groups sorted left-to-right.
   */
  private detectColumns(items: TextItem[]): ColumnGroup[] {
    if (items.length === 0) return [];

    // Extract x-positions from transform arrays.
    const positions = items.map((item) => ({
      item,
      x: item.transform[4] ?? 0,
    }));

    // Sort by x position.
    positions.sort((a, b) => a.x - b.x);

    // Find gaps larger than threshold to split columns.
    const posGroups: { item: TextItem; x: number }[][] = [[positions[0]!]];
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1]!;
      const curr = positions[i]!;
      if (curr.x - prev.x > COLUMN_GAP_THRESHOLD) {
        posGroups.push([curr]);
      } else {
        posGroups[posGroups.length - 1]!.push(curr);
      }
    }

    if (posGroups.length <= 1) {
      // Single column — return all items as one group.
      return [{ xMin: 0, xMax: 0, items }];
    }

    return posGroups.map((group) => ({
      xMin: Math.min(...group.map((p) => p.x)),
      xMax: Math.max(...group.map((p) => p.x)),
      items: group.map((p) => p.item),
    }));
  }

  /**
   * Process a list of text items into AST nodes (headings and paragraphs).
   */
  private processTextItems(
    items: TextItem[],
    bodyFontSize: number,
    ratios: { h1?: number; h2?: number; h3?: number },
    headings: HeadingInfo[],
    _linkMap: Map<string, string>
  ): AnyNode[] {
    const nodes: AnyNode[] = [];
    let currentLine = "";
    let lastFontSize = 0;
    let lastY = 0;

    const flushLine = () => {
      const trimmed = currentLine.trim();
      if (!trimmed) return;

      const heading = this.classifyHeading(trimmed, lastFontSize, bodyFontSize, ratios);
      if (heading) {
        headings.push(heading);
        const level = heading.level as 1 | 2 | 3 | 4 | 5 | 6;
        nodes.push(
          createNode<HeadingNode>({
            type: "heading",
            level,
            children: [createNode<TextNode>({ type: "text", value: heading.text })],
          })
        );
      } else {
        nodes.push(
          createNode<ParagraphNode>({
            type: "paragraph",
            children: [createNode<TextNode>({ type: "text", value: trimmed })],
          })
        );
      }
      currentLine = "";
    };

    for (const item of items) {
      if (!item.str) continue;

      const fontSize = item.fontSize;
      const y = item.transform[5] ?? 0;

      if (
        currentLine &&
        (Math.abs(y - lastY) > fontSize * 0.5 ||
          (fontSize !== lastFontSize && lastFontSize > 0))
      ) {
        flushLine();
      }

      currentLine += item.str;
      lastFontSize = fontSize;
      lastY = y;
    }

    flushLine();
    return nodes;
  }

  /**
   * Detect tables by finding text items that align on consistent x-positions
   * across multiple rows.
   */
  private detectTables(items: TextItem[]): TableData[] {
    if (items.length < 6) return []; // Need at least 6 items for a 2x3 table

    // Group items by approximate y-position (same row).
    const rows = this.groupByRow(items);
    if (rows.length < 2) return [];

    // Find x-positions that appear across multiple rows.
    const xBuckets = new Map<number, number>(); // x-bucket -> count of rows
    for (const row of rows) {
      const uniqueXs = new Set<number>();
      for (const item of row) {
        const xBucket = Math.round((item.transform[4] ?? 0) / 10) * 10; // bucket by 10 units
        uniqueXs.add(xBucket);
      }
      for (const x of uniqueXs) {
        xBuckets.set(x, (xBuckets.get(x) ?? 0) + 1);
      }
    }

    // Columns must appear in at least half the rows.
    const minRowCount = Math.ceil(rows.length * 0.5);
    const columnXs = Array.from(xBuckets.entries())
      .filter(([_, count]) => count >= minRowCount)
      .map(([x]) => x)
      .sort((a, b) => a - b);

    if (columnXs.length < 2) return []; // Need at least 2 columns for a table

    // Build the table grid.
    const tableRows: string[][] = [];
    for (const row of rows) {
      const cells: string[] = new Array(columnXs.length).fill("");
      for (const item of row) {
        const x = item.transform[4] ?? 0;
        // Find closest column.
        let bestCol = 0;
        let bestDist = Infinity;
        for (let c = 0; c < columnXs.length; c++) {
          const dist = Math.abs(x - columnXs[c]!);
          if (dist < bestDist) {
            bestDist = dist;
            bestCol = c;
          }
        }
        if (bestDist < 30) {
          cells[bestCol] = cells[bestCol] ? cells[bestCol] + " " + item.str : item.str;
        }
      }
      if (cells.some((c) => c.trim() !== "")) {
        tableRows.push(cells);
      }
    }

    if (tableRows.length < 2) return [];

    const headers = tableRows[0]!;
    const dataRows = tableRows.slice(1);

    return [
      {
        headers,
        rows: dataRows,
      },
    ];
  }

  /**
   * Group text items into rows by approximate y-position.
   */
  private groupByRow(items: TextItem[]): TextItem[][] {
    const sorted = [...items].sort((a, b) => (b.transform[5] ?? 0) - (a.transform[5] ?? 0));
    const rows: TextItem[][] = [];
    let currentRow: TextItem[] = [sorted[0]!];
    let lastY = sorted[0]!.transform[5] ?? 0;

    for (let i = 1; i < sorted.length; i++) {
      const item = sorted[i]!;
      const y = item.transform[5] ?? 0;
      if (Math.abs(y - lastY) < item.fontSize * 0.5) {
        currentRow.push(item);
      } else {
        rows.push(currentRow.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0)));
        currentRow = [item];
        lastY = y;
      }
    }
    rows.push(currentRow.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0)));
    return rows;
  }

  /**
   * Build a TableNode AST node from TableData.
   */
  private buildTableNode(data: TableData): TableNode | null {
    if (data.headers.length === 0) return null;

    const headerRow = createNode<TableRowNode>({
      type: "table-row",
      isHeader: true,
      children: data.headers.map(
        (h) =>
          createNode<TableCellNode>({
            type: "table-cell",
            children: [createNode<TextNode>({ type: "text", value: h })],
          })
      ),
    });

    const dataRowNodes = data.rows.map(
      (row) =>
        createNode<TableRowNode>({
          type: "table-row",
          isHeader: false,
          children: row.map(
            (cell) =>
              createNode<TableCellNode>({
                type: "table-cell",
                children: [createNode<TextNode>({ type: "text", value: cell })],
              })
          ),
        })
    );

    return createNode<TableNode>({
      type: "table",
      children: [headerRow, ...dataRowNodes],
    });
  }

  private extractFontSize(item: Record<string, unknown>): number {
    const transform = item.transform as number[] | undefined;
    if (!transform || transform.length < 1) return 0;
    const val = transform[0];
    return val !== undefined ? Math.abs(val) : 0;
  }

  private classifyHeading(
    text: string,
    fontSize: number,
    bodyFontSize: number,
    ratios: { h1?: number; h2?: number; h3?: number } = {}
  ): HeadingInfo | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;

    if (bodyFontSize > 0) {
      const ratio = fontSize / bodyFontSize;
      if (ratio > (ratios.h1 ?? 1.8)) return { level: 1, text: trimmed };
      if (ratio > (ratios.h2 ?? 1.4)) return { level: 2, text: trimmed };
      if (ratio > (ratios.h3 ?? 1.15)) return { level: 3, text: trimmed };
      return undefined;
    }

    if (fontSize > 20) return { level: 1, text: trimmed };
    if (fontSize > 16) return { level: 2, text: trimmed };
    if (fontSize > 13) return { level: 3, text: trimmed };
    return undefined;
  }

  private async toByteArray(data: Uint8Array | ArrayBuffer | Blob | string): Promise<Uint8Array> {
    if (data instanceof Uint8Array) {
      return data.constructor === Uint8Array
        ? data
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      return new Uint8Array(await data.arrayBuffer());
    }
    return new TextEncoder().encode(data as string);
  }
}
