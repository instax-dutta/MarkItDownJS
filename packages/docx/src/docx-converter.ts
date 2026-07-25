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
  parseXML,
  strictCanConvert,
  checkZipBombRisk,
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  StrongNode,
  EmphasisNode,
  LinkNode,
  StrikethroughNode,
  ImageNode,
} from "@markitdownjs/shared";
import { MarkdownRenderer } from "@markitdownjs/ast";
import { isTag } from "./utils.js";

/** Convert DOCX files to markdown via AST-first processing. */
export class DocxConverter implements Converter {
  readonly id = "docx" as const;
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  readonly supportedExtensions = [".docx"];

  /**
   * Determine whether this converter can handle the given input.
   * @param input - The conversion input to inspect.
   * @returns True if the input is a supported DOCX.
   */
  async canConvert(input: ConversionInput): Promise<boolean> {
    // Strict dispatch: do NOT fall back to ZIP magic bytes — that header is shared by
    // .docx, .xlsx, .pptx, .epub and would cause this converter to intercept other formats.
    return strictCanConvert(input, {
      mimeTypes: this.supportedMimeTypes,
      extensions: this.supportedExtensions,
    });
  }

  /**
   * Convert a DOCX document into markdown via an AST intermediate.
   *
   * The converter uses JSZip to unpack the DOCX archive, parses the main
   * document XML and relationship mappings, then walks paragraphs, runs,
   * tables, lists, and hyperlinks to build an AST. Metadata is extracted
   * from docProps/core.xml when present.
   *
   * @param input - The conversion input containing DOCX data.
   * @returns A complete ConversionResult with markdown, AST, and metadata.
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = Date.now();
    const data = await this.toByteArray(input.data);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(data);
    checkZipBombRisk(zip);
    const renderer = new MarkdownRenderer();
    const warnings: ConversionWarning[] = [];
    const opts = input.options ?? {};
    const includeComments = (opts.customProperties?.includeComments as boolean) ?? false;

    // Parse relationship map (rId -> target file).
    const relsMap = await this.parseRelationships(zip);

    // Parse core metadata if available.
    const metadata = await this.parseMetadata(zip);

    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) {
      throw new Error("Invalid DOCX: word/document.xml not found");
    }

    const doc = await parseXML(documentXml);
    const body = doc.getElementsByTagName("w:body")[0];
    if (!body) {
      throw new Error("Invalid DOCX: no body element found");
    }

    // Process document body.
    const children: AnyNode[] = [];
    const headings: HeadingInfo[] = [];
    const tables: TableData[] = [];

    for (let i = 0; i < body.childNodes.length; i++) {
      const child = body.childNodes[i] as Element;
      if (!child) continue;

      // Strip track changes / comments unless includeComments is enabled.
      if (!includeComments) {
        const tag = child.tagName?.toLowerCase();
        if (tag === "w:sectpr" || tag === "w:commentRangeStart" || tag === "w:commentRangeEnd") {
          continue;
        }
      }

      if (isTag(child, "p")) {
        const para = this.parseParagraph(child, relsMap);
        if (para) {
          children.push(para);
          if (para.type === "heading") {
            headings.push({
              level: (para as HeadingNode).level,
              text: this.getNodeText(para),
            });
          }
        }
      } else if (isTag(child, "tbl")) {
        const table = this.parseTable(child, relsMap);
        if (table) {
          children.push(table);
          tables.push(this.extractTableData(table));
        }
      }
    }

    const ast = createNode<DocumentNode>({ type: "document", children });
    const markdown = renderer.render(ast);

    const endTime = Date.now();

    return {
      markdown,
      metadata,
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
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Parse word/_rels/document.xml.rels to build a relationship ID -> target mapping.
   *
   * @param zip - The JSZip archive of the DOCX.
   * @returns A Map from rId to the relative target path.
   */
  private async parseRelationships(
    zip: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
    if (!relsXml) return map;

    const doc = await parseXML(relsXml);
    const rels = doc.getElementsByTagName("Relationship");
    for (let i = 0; i < rels.length; i++) {
      const rel = rels.item(i);
      if (!rel) continue;
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        map.set(id, target);
      }
    }
    return map;
  }

  /**
   * Parse docProps/core.xml to extract document metadata.
   *
   * @param zip - The JSZip archive of the DOCX.
   * @returns A DocumentMetadata object with available fields populated.
   */
  private async parseMetadata(
    zip: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, unknown>> {
    const metadata: Record<string, unknown> = {};
    const coreXml = await zip.file("docProps/core.xml")?.async("string");
    if (!coreXml) return metadata;

    try {
      const doc = await parseXML(coreXml);

      const title = doc.getElementsByTagName("dc:title")[0];
      if (title) metadata.title = title.textContent ?? undefined;

      const creator = doc.getElementsByTagName("dc:creator")[0];
      if (creator) metadata.author = creator.textContent ?? undefined;

      const created = doc.getElementsByTagName("dcterms:created")[0];
      if (created) metadata.createdAt = created.textContent ?? undefined;

      const modified = doc.getElementsByTagName("dcterms:modified")[0];
      if (modified) metadata.modifiedAt = modified.textContent ?? undefined;

      const description = doc.getElementsByTagName("dc:description")[0];
      if (description) metadata.description = description.textContent ?? undefined;

      const subject = doc.getElementsByTagName("dc:subject")[0];
      if (subject) metadata.subject = subject.textContent ?? undefined;
    } catch {
      // Metadata parsing is best-effort.
    }

    return metadata;
  }

  /**
   * Parse a w:p paragraph element into a HeadingNode or ParagraphNode.
   *
   * Handles heading styles (Heading1-6), list items, and inline formatting
   * (bold, italic, strikethrough). Hyperlinks are resolved via the
   * relationship map.
   *
   * @param paraEl - The w:p XML element.
   * @param relsMap - Relationship ID to target path mapping.
   * @returns A HeadingNode, ParagraphNode, or null if the paragraph is empty.
   */
  private parseParagraph(
    paraEl: Element,
    relsMap: Map<string, string>
  ): ParagraphNode | HeadingNode | null {
    const pStyle = this.getParagraphStyle(paraEl);
    const inlineNodes = this.mergeInlineRuns(this.parseRuns(paraEl, relsMap));

    // Also gather text from hyperlinks that are direct children of the paragraph.
    const hyperlinkNodes = this.parseHyperlinks(paraEl, relsMap);
    const allNodes = [...inlineNodes, ...hyperlinkNodes];

    if (allNodes.length === 0) return null;

    // Check for heading style.
    if (pStyle && /^Heading[1-6]$/.test(pStyle)) {
      const level = parseInt(pStyle.replace("Heading", ""), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      return createNode<HeadingNode>({
        type: "heading",
        level,
        children: allNodes,
      });
    }

    return createNode<ParagraphNode>({
      type: "paragraph",
      children: allNodes,
    });
  }

  /**
   * Extract the paragraph style identifier (e.g. "Heading1").
   *
   * @param paraEl - The w:p XML element.
   * @returns The style value, or undefined if none.
   */
  private getParagraphStyle(paraEl: Element): string | undefined {
    const pPr = paraEl.getElementsByTagName("w:pPr")[0];
    if (!pPr) return undefined;
    const pStyle = pPr.getElementsByTagName("w:pStyle")[0];
    if (!pStyle) return undefined;
    return pStyle.getAttribute("w:val") ?? undefined;
  }

  /**
   * Parse w:r run elements inside a paragraph, applying inline formatting.
   *
   * Recognised formatting: w:b (bold), w:i (italic), w:strike (strikethrough).
   *
   * @param paraEl - The w:p XML element.
   * @param _relsMap - Relationship mapping (unused for runs, kept for signature).
   * @returns An array of inline AST nodes.
   */
  private parseRuns(paraEl: Element, relsMap: Map<string, string>): AnyNode[] {
    const nodes: AnyNode[] = [];
    const runs = paraEl.getElementsByTagName("w:r");

    for (let i = 0; i < runs.length; i++) {
      const run = runs.item(i);
      if (!run) continue;

      // Check for inline images in <w:drawing> elements.
      const drawing = run.getElementsByTagName("w:drawing")[0];
      if (drawing) {
        const imageNode = this.parseDrawing(drawing, relsMap);
        if (imageNode) {
          nodes.push(imageNode);
          continue;
        }
      }

      const textEl = run.getElementsByTagName("w:t")[0];
      if (!textEl) continue;

      const text = textEl.textContent ?? "";
      if (!text) continue;

      const rPr = run.getElementsByTagName("w:rPr")[0];
      const isBold = this.hasFlag(rPr, "w:b");
      const isItalic = this.hasFlag(rPr, "w:i");
      const isStrikethrough = this.hasFlag(rPr, "w:strike");

      let node: AnyNode = createNode<TextNode>({
        type: "text",
        value: text,
      });

      if (isItalic) {
        node = createNode<EmphasisNode>({
          type: "emphasis",
          children: [node],
        });
      }
      if (isBold) {
        node = createNode<StrongNode>({
          type: "strong",
          children: [node],
        });
      }
      if (isStrikethrough) {
        node = createNode<StrikethroughNode>({
          type: "strikethrough",
          children: [node],
        });
      }

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Parse a w:drawing element to extract an inline image.
   *
   * Looks for the relationship ID in wp:docPr or a:blip, resolves it via
   * the relationship map, and reads the image data from the zip archive.
   *
   * @param drawingEl - The w:drawing XML element.
   * @param relsMap - Relationship ID to target path mapping.
   * @returns An ImageNode, or null if the image cannot be extracted.
   */
  private parseDrawing(drawingEl: Element, relsMap: Map<string, string>): ImageNode | null {
    // Try wp:inline first (most common for inline images).
    const inline = drawingEl.getElementsByTagName("wp:inline")[0];
    if (!inline) return null;

    // Extract alt text from wp:docPr.
    const docPr = inline.getElementsByTagName("wp:docPr")[0];
    const alt = docPr?.getAttribute("title") ?? docPr?.getAttribute("descr") ?? undefined;

    // Find the blip element for the relationship ID.
    const blip = inline.getElementsByTagName("a:blip")[0];
    const rid = blip?.getAttribute("r:embed") ?? blip?.getAttribute("r:link") ?? "";
    if (!rid) return null;

    const target = relsMap.get(rid);
    if (!target) return null;

    // Build the image path (relative to word/ directory).
    const imagePath = target.startsWith("/") ? target : `word/${target}`;

    return createNode<ImageNode>({
      type: "image",
      src: imagePath,
      alt,
      mimeType: this.guessImageMimeType(target),
    });
  }

  /**
   * Guess the MIME type from a file extension.
   */
  private guessImageMimeType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "png": return "image/png";
      case "jpg":
      case "jpeg": return "image/jpeg";
      case "gif": return "image/gif";
      case "bmp": return "image/bmp";
      case "tiff":
      case "tif": return "image/tiff";
      case "emf": return "image/emf";
      case "wmf": return "image/wmf";
      default: return "image/png";
    }
  }

  /**
   * Parse w:hyperlink elements inside a paragraph, resolving targets via the
   * relationship map.
   *
   * @param paraEl - The w:p XML element.
   * @param relsMap - Relationship ID to target path mapping.
   * @returns An array of LinkNode elements.
   */
  private parseHyperlinks(paraEl: Element, relsMap: Map<string, string>): LinkNode[] {
    const links: LinkNode[] = [];
    const hyperlinks = paraEl.getElementsByTagName("w:hyperlink");

    for (let i = 0; i < hyperlinks.length; i++) {
      const hl = hyperlinks.item(i);
      if (!hl) continue;

      const rid = hl.getAttribute("r:id") ?? "";
      const href = relsMap.get(rid) ?? "";

      // Gather text from runs inside the hyperlink.
      const textNodes: AnyNode[] = [];
      const runs = hl.getElementsByTagName("w:r");
      for (let j = 0; j < runs.length; j++) {
        const run = runs.item(j);
        if (!run) continue;
        const tEl = run.getElementsByTagName("w:t")[0];
        const text = tEl?.textContent ?? "";
        if (text) {
          textNodes.push(createNode<TextNode>({ type: "text", value: text }));
        }
      }

      if (textNodes.length > 0 && href) {
        links.push(
          createNode<LinkNode>({
            type: "link",
            href,
            children: textNodes,
          })
        );
      }
    }

    return links;
  }

  /**
   * Check whether a run properties element has a boolean flag set.
   *
   * @param rPr - The w:rPr element, or undefined.
   * @param tagName - The tag to check (e.g. "w:b").
   * @returns True if the flag is present and not explicitly set to false/0.
   */
  private hasFlag(rPr: Element | undefined, tagName: string): boolean {
    if (!rPr) return false;
    const el = rPr.getElementsByTagName(tagName)[0];
    if (!el) return false;
    const val = el.getAttribute("w:val");
    return val === null || val === "true" || val === "1";
  }

  /**
   * Parse a w:tbl table element into a TableNode.
   *
   * Handles w:gridSpan for colspan and nested paragraphs within cells.
   *
   * @param tblEl - The w:tbl XML element.
   * @param relsMap - Relationship mapping for hyperlink resolution.
   * @returns A TableNode, or null if no rows are found.
   */
  private parseTable(tblEl: Element, relsMap: Map<string, string>): TableNode | null {
    const rows: TableRowNode[] = [];
    const trs = tblEl.getElementsByTagName("w:tr");

    for (let i = 0; i < trs.length; i++) {
      const tr = trs.item(i);
      if (!tr) continue;

      const cells: TableCellNode[] = [];
      const tcs = tr.getElementsByTagName("w:tc");

      for (let j = 0; j < tcs.length; j++) {
        const tc = tcs.item(j);
        if (!tc) continue;

        // Determine colspan from w:gridSpan.
        let colspan: number | undefined;
        const gridSpan = tc.getElementsByTagName("w:gridSpan")[0];
        if (gridSpan) {
          const val = parseInt(gridSpan.getAttribute("w:val") ?? "1", 10);
          if (val > 1) colspan = val;
        }

        // Parse paragraphs inside the cell.
        const cellNodes: AnyNode[] = [];
        const paragraphs = tc.getElementsByTagName("w:p");
        for (let k = 0; k < paragraphs.length; k++) {
          const para = this.parseParagraph(paragraphs.item(k)!, relsMap);
          if (para) cellNodes.push(para);
        }
        if (cellNodes.length === 0) {
          cellNodes.push(createNode<TextNode>({ type: "text", value: "" }));
        }

        cells.push(
          createNode<TableCellNode>({
            type: "table-cell",
            children: cellNodes,
            ...(colspan !== undefined ? { colspan } : {}),
          })
        );
      }

      if (cells.length > 0) {
        rows.push(
          createNode<TableRowNode>({
            type: "table-row",
            children: cells,
            isHeader: i === 0,
          })
        );
      }
    }

    if (rows.length === 0) return null;

    return createNode<TableNode>({
      type: "table",
      children: rows,
    });
  }

  /**
   * Extract a TableData summary from a TableNode for the ConversionResult.
   *
   * @param table - The parsed TableNode.
   * @returns A TableData object with headers and rows.
   */
  private extractTableData(table: TableNode): TableData {
    const allRows = table.children;
    if (allRows.length === 0) return { headers: [], rows: [] };

    const headerRow = allRows[0]!;
    const headers = headerRow.children.map((cell) => this.getNodeText(cell));

    const dataRows: string[][] = [];
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i]!;
      dataRows.push(row.children.map((cell) => this.getNodeText(cell)));
    }

    return { headers, rows: dataRows };
  }

  /**
   * Recursively extract all text content from an AST node.
   *
   * @param node - The AST node to extract text from.
   * @returns The concatenated text content.
   */
  private getNodeText(node: AnyNode): string {
    if (node.type === "text") return (node as TextNode).value;
    if ("children" in node && node.children) {
      return (node.children as AnyNode[]).map((c) => this.getNodeText(c)).join("");
    }
    return "";
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

  /**
   * Remove empty inline nodes and merge adjacent same-type wrapper nodes to
   * eliminate `****` / `**text1****text2**` artifacts from OOXML run splitting.
   */
  private mergeInlineRuns(nodes: AnyNode[]): AnyNode[] {
    const filtered = nodes.filter((n) => this.hasInlineContent(n));

    const merged: AnyNode[] = [];
    for (const node of filtered) {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.type === node.type &&
        (node.type === "strong" || node.type === "emphasis" || node.type === "strikethrough")
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (last as any).children.push(...(node as any).children);
      } else {
        merged.push(node);
      }
    }

    return merged;
  }

  /** Returns true if the node contains at least one non-empty text leaf. */
  private hasInlineContent(node: AnyNode): boolean {
    if (node.type === "text") return (node as TextNode).value !== "";
    if ("children" in node && Array.isArray(node.children)) {
      return (node.children as AnyNode[]).some((c) => this.hasInlineContent(c));
    }
    return true;
  }
}
