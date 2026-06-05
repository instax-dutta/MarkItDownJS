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
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  PageBreakNode,
} from "@markitdownjs/shared";
import { MarkdownRenderer } from "@markitdownjs/ast";

/** Convert PDF files to markdown via AST-first processing. */
export class PdfConverter implements Converter {
  readonly id = "pdf" as const;
  readonly supportedMimeTypes = ["application/pdf"];
  readonly supportedExtensions = [".pdf"];

  /**
   * Determine whether this converter can handle the given input.
   * @param input - The conversion input to inspect.
   * @returns True if the input is a supported PDF.
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

  /**
   * Convert a PDF document into markdown via an AST intermediate.
   *
   * The converter dynamically imports pdfjs-dist, disables the worker, loads
   * the PDF, and walks every page extracting text with positional data,
   * annotations (links), and font-size information for heading detection.
   * An AST is assembled first and then rendered to markdown.
   *
   * @param input - The conversion input containing PDF data.
   * @returns A complete ConversionResult with markdown, AST, and metadata.
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = Date.now();
    const data = await this.toByteArray(input.data);
    const renderer = new MarkdownRenderer();

    let ast: DocumentNode;
    let markdown: string;
    const headings: HeadingInfo[] = [];
    const tables: TableData[] = [];
    let pageCount = 0;

    try {
      const pdfjsLib = await import("pdfjs-dist");

      // Disable the worker so we don't need a separate worker file.
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";

      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages;

      const pageNodes: AnyNode[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const annotations = await page.getAnnotations();

        // Collect font sizes for heading classification.
        const fontSizes = new Map<number, number>();
        for (const item of textContent.items) {
          if (!("str" in item) || !item.str) continue;
          const fontSize = this.extractFontSize(item);
          if (fontSize > 0) {
            fontSizes.set(fontSize, (fontSizes.get(fontSize) ?? 0) + 1);
          }
        }

        // Determine the body font size (most common).
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
            // Store by approximate bounding box for lookup.
            const key = `${Math.round(rect[0])},${Math.round(rect[1])},${Math.round(rect[2])},${Math.round(rect[3])}`;
            linkMap.set(key, annot.url);
          }
        }

        // Group text items into logical lines / paragraphs.
        const items = textContent.items;
        let currentLine = "";
        let lastFontSize = 0;
        let lastY = 0;

        const flushLine = () => {
          const trimmed = currentLine.trim();
          if (!trimmed) return;

          const heading = this.classifyHeading(trimmed, lastFontSize, bodyFontSize);
          if (heading) {
            headings.push(heading);
            const level = heading.level as 1 | 2 | 3 | 4 | 5 | 6;
            pageNodes.push(
              createNode<HeadingNode>({
                type: "heading",
                level,
                children: [createNode<TextNode>({ type: "text", value: heading.text })],
              })
            );
          } else {
            pageNodes.push(
              createNode<ParagraphNode>({
                type: "paragraph",
                children: [createNode<TextNode>({ type: "text", value: trimmed })],
              })
            );
          }
          currentLine = "";
        };

        for (const item of items) {
          if (!("str" in item)) continue;
          const str = item.str;
          if (!str) continue;

          const fontSize = this.extractFontSize(item);
          const y = "transform" in item && item.transform ? item.transform[5] : 0;

          // New line when Y position changes significantly or font size changes.
          if (
            currentLine &&
            (Math.abs(y - lastY) > fontSize * 0.5 ||
              (fontSize !== lastFontSize && lastFontSize > 0))
          ) {
            flushLine();
          }

          currentLine += str;
          lastFontSize = fontSize;
          lastY = y;
        }

        flushLine();

        // Add page break between pages (not after the last page).
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
    } catch {
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
    };
  }

  /**
   * Extract the font size from a PDF text item's transform matrix.
   *
   * The transform array is `[scaleX, skewX, skewY, scaleY, x, y]`.
   * The font size is derived from the absolute value of `scaleX`.
   *
   * @param item - A PDF text content item.
   * @returns The detected font size, or 0 if unavailable.
   */
  private extractFontSize(item: Record<string, unknown>): number {
    const transform = item.transform as number[] | undefined;
    if (!transform || transform.length < 1) return 0;
    const val = transform[0];
    return val !== undefined ? Math.abs(val) : 0;
  }

  /**
   * Classify a text line as a heading based on its font size relative to the
   * document body font size.
   *
   * @param text - The raw text of the line.
   * @param fontSize - The font size of the line.
   * @param bodyFontSize - The most common (body) font size in the document.
   * @returns A HeadingInfo if the line qualifies as a heading, otherwise undefined.
   */
  private classifyHeading(
    text: string,
    fontSize: number,
    bodyFontSize: number
  ): HeadingInfo | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;

    // Use relative sizing when a body font size is known.
    if (bodyFontSize > 0) {
      const ratio = fontSize / bodyFontSize;
      if (ratio > 1.8) return { level: 1, text: trimmed };
      if (ratio > 1.4) return { level: 2, text: trimmed };
      if (ratio > 1.15) return { level: 3, text: trimmed };
      return undefined;
    }

    // Fallback to absolute thresholds.
    if (fontSize > 20) return { level: 1, text: trimmed };
    if (fontSize > 16) return { level: 2, text: trimmed };
    if (fontSize > 13) return { level: 3, text: trimmed };
    return undefined;
  }

  /**
   * Convert input data to a Uint8Array.
   * @param data - The input data in any supported format.
   * @returns The data as a Uint8Array.
   */
  private async toByteArray(data: Uint8Array | ArrayBuffer | Blob | string): Promise<Uint8Array> {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    return new TextEncoder().encode(data);
  }
}
