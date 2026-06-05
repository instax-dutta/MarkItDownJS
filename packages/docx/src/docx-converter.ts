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
  ParagraphNode,
  TextNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  StrongNode,
  EmphasisNode,
  LinkNode,
  StrikethroughNode,
} from "@markitdownjs/shared";
import { MarkdownRenderer } from "@markitdownjs/ast";

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
    const renderer = new MarkdownRenderer();

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

    const children: AnyNode[] = [];
    const headings: HeadingInfo[] = [];
    const tables: TableData[] = [];

    for (let i = 0; i < body.childNodes.length; i++) {
      const child = body.childNodes[i] as Element;
      if (!child) continue;

      if (child.localName === "p") {
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
      } else if (child.localName === "tbl") {
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
    const inlineNodes = this.parseRuns(paraEl, relsMap);

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
  private parseRuns(paraEl: Element, _relsMap: Map<string, string>): AnyNode[] {
    const nodes: AnyNode[] = [];
    const runs = paraEl.getElementsByTagName("w:r");

    for (let i = 0; i < runs.length; i++) {
      const run = runs.item(i);
      if (!run) continue;

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
}
