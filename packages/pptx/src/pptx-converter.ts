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
  SectionNode,
  PageBreakNode,
  StrongNode,
} from "@markitdownjs/shared";
import { MarkdownRenderer } from "@markitdownjs/ast";

/** Convert PPTX files to markdown via AST-first processing. */
export class PptxConverter implements Converter {
  readonly id = "pptx" as const;
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  readonly supportedExtensions = [".pptx"];

  /**
   * Determine whether this converter can handle the given input.
   * @param input - The conversion input to inspect.
   * @returns True if the input is a supported PPTX.
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
   * Convert a PPTX presentation into markdown via an AST intermediate.
   *
   * The converter uses JSZip to unpack the archive, reads the slide ordering
   * from ppt/presentation.xml, then processes each slide in order extracting
   * text, titles, tables, and speaker notes.
   *
   * @param input - The conversion input containing PPTX data.
   * @returns A complete ConversionResult with markdown, AST, and metadata.
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = Date.now();
    const data = await this.toByteArray(input.data);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(data);
    const renderer = new MarkdownRenderer();

    // Parse slide ordering from presentation.xml.
    const slideOrder = await this.parseSlideOrder(zip);

    const slideNodes: AnyNode[] = [];
    const headings: HeadingInfo[] = [];
    const tables: TableData[] = [];
    let slideCount = 0;

    for (let idx = 0; idx < slideOrder.length; idx++) {
      const slidePath = slideOrder[idx] as string;
      const slideXml = await zip.file(slidePath)?.async("string");
      if (!slideXml) continue;

      slideCount++;
      const slideDoc = await parseXML(slideXml);

      // Detect the title shape (name contains "Title").
      const title = this.detectTitleShape(slideDoc);

      // Extract all text runs grouped by shape / paragraph.
      const contentGroups = this.extractContentGroups(slideDoc);

      // Parse tables on the slide.
      const slideTables = this.extractTables(slideDoc);

      // Build slide section children.
      const sectionChildren: AnyNode[] = [];

      // Title as heading.
      const titleText = title ?? `Slide ${slideCount}`;
      const headingNode = createNode<HeadingNode>({
        type: "heading",
        level: 2,
        children: [
          createNode<TextNode>({ type: "text", value: titleText }),
        ],
      });
      sectionChildren.push(headingNode);
      headings.push({ level: 2, text: titleText });

      // Content paragraphs.
      for (const group of contentGroups) {
        if (group === title) continue; // Skip title since we already rendered it.
        const trimmed = group.trim();
        if (!trimmed) continue;
        sectionChildren.push(
          createNode<ParagraphNode>({
            type: "paragraph",
            children: [
              createNode<TextNode>({ type: "text", value: trimmed }),
            ],
          })
        );
      }

      // Tables.
      for (const slideTable of slideTables) {
        sectionChildren.push(slideTable);
        tables.push(this.extractTableData(slideTable));
      }

      // Speaker notes.
      const notesPath = slidePath
        .replace("ppt/slides/slide", "ppt/notesSlides/notesSlide")
        .replace(".xml", ".xml");
      const notesXml = notesPath ? await zip.file(notesPath)?.async("string") : undefined;
      if (notesXml) {
        const notesDoc = await parseXML(notesXml);
        const notesTexts = this.extractAllText(notesDoc);
        if (notesTexts.length > 0) {
          sectionChildren.push(
            createNode<ParagraphNode>({
              type: "paragraph",
              children: [
                createNode<StrongNode>({
                  type: "strong",
                  children: [
                    createNode<TextNode>({
                      type: "text",
                      value: "Speaker Notes:",
                    }),
                  ],
                }),
              ],
            })
          );
          for (const noteText of notesTexts) {
            sectionChildren.push(
              createNode<ParagraphNode>({
                type: "paragraph",
                children: [
                  createNode<TextNode>({ type: "text", value: noteText }),
                ],
              })
            );
          }
        }
      }

      // Wrap each slide in a SectionNode.
      slideNodes.push(
        createNode<SectionNode>({
          type: "section",
          title: titleText,
          children: sectionChildren,
        })
      );

      // Page break between slides.
      if (idx < slideOrder.length - 1) {
        slideNodes.push(
          createNode<PageBreakNode>({
            type: "page-break",
            pageNumber: slideCount,
          })
        );
      }
    }

    const ast = createNode<DocumentNode>({
      type: "document",
      children: slideNodes,
    });
    const markdown = renderer.render(ast);
    const endTime = Date.now();

    return {
      markdown,
      metadata: {
        pageCount: slideCount,
        format:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
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
        pagesProcessed: slideCount,
      },
    };
  }

  /**
   * Parse ppt/presentation.xml to extract the ordered list of slide file paths.
   *
   * @param zip - The JSZip archive of the PPTX.
   * @returns An ordered array of slide XML file paths.
   */
  private async parseSlideOrder(
    zip: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<string[]> {
    const order: string[] = [];
    const presXml = await zip
      .file("ppt/presentation.xml")
      ?.async("string");
    if (!presXml) {
      // Fallback: collect slide files and sort.
      zip.forEach((path: string) => {
        if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
          order.push(path);
        }
      });
      order.sort();
      return order;
    }

    const doc = await parseXML(presXml);
    const sldIdLst = doc.getElementsByTagName("p:sldIdLst")[0];
    if (!sldIdLst) {
      zip.forEach((path: string) => {
        if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
          order.push(path);
        }
      });
      order.sort();
      return order;
    }

    const rIds = sldIdLst.getElementsByTagName("p:sldId");
    for (let i = 0; i < rIds.length; i++) {
      const el = rIds.item(i);
      if (!el) continue;
      const rid = el.getAttribute("r:id") ?? "";
      if (rid) order.push(rid);
    }

    // Resolve rIds through presentation.xml.rels.
    const relsXml = await zip
      .file("ppt/_rels/presentation.xml.rels")
      ?.async("string");
    if (!relsXml) return order;

    const relsDoc = await parseXML(relsXml);
    const rels = relsDoc.getElementsByTagName("Relationship");
    const ridToTarget = new Map<string, string>();
    for (let i = 0; i < rels.length; i++) {
      const rel = rels.item(i);
      if (!rel) continue;
      const id = rel.getAttribute("Id") ?? "";
      const target = rel.getAttribute("Target") ?? "";
      if (id && target) ridToTarget.set(id, target);
    }

    return order
      .map((rid) => {
        const target = ridToTarget.get(rid);
        if (target && !target.startsWith("/")) {
          return target.startsWith("ppt/") ? target : `ppt/${target}`;
        }
        return "";
      })
      .filter((p) => p.length > 0);
  }

  /**
   * Detect the title shape on a slide by looking for a shape whose
   * nvSpPr/cNvPr name contains "Title".
   *
   * @param slideDoc - The parsed slide XML document.
   * @returns The concatenated title text, or undefined if no title shape is found.
   */
  private detectTitleShape(slideDoc: Document): string | undefined {
    const spTree = slideDoc.getElementsByTagName("p:spTree")[0];
    if (!spTree) return undefined;

    const shapes = spTree.getElementsByTagName("p:sp");
    for (let i = 0; i < shapes.length; i++) {
      const sp = shapes.item(i);
      if (!sp) continue;

      const cNvPr = sp.getElementsByTagName("p:cNvPr")[0];
      if (!cNvPr) continue;
      const name = cNvPr.getAttribute("name") ?? "";
      if (/title/i.test(name)) {
        const texts = this.extractShapeText(sp);
        if (texts.length > 0) return texts.join("");
      }
    }

    return undefined;
  }

  /**
   * Extract content groups (by paragraph) from a slide's shapes.
   *
   * @param slideDoc - The parsed slide XML document.
   * @returns An array of text strings, one per paragraph across all shapes.
   */
  private extractContentGroups(slideDoc: Document): string[] {
    const groups: string[] = [];
    const spTree = slideDoc.getElementsByTagName("p:spTree")[0];
    if (!spTree) return groups;

    const shapes = spTree.children;
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i] as Element;
      if (!shape) continue;

      // Process paragraphs within shapes (txBody > bodyPr > lstStyle + p).
      const txBody =
        shape.getElementsByTagName("p:txBody")[0] ??
        shape.getElementsByTagName("a:txBody")[0];
      if (!txBody) continue;

      const paragraphs = txBody.getElementsByTagName("a:p");
      for (let j = 0; j < paragraphs.length; j++) {
        const p = paragraphs.item(j);
        if (!p) continue;

        const runs = p.getElementsByTagName("a:r");
        let line = "";
        for (let k = 0; k < runs.length; k++) {
          const run = runs.item(k);
          if (!run) continue;
          const tEl = run.getElementsByTagName("a:t")[0];
          if (tEl) {
            line += tEl.textContent ?? "";
          }
        }
        groups.push(line);
      }
    }

    return groups;
  }

  /**
   * Extract all text from any XML document (used for both slides and notes).
   *
   * @param doc - The parsed XML document.
   * @returns An array of non-empty text strings from a:t elements.
   */
  private extractAllText(doc: Document): string[] {
    const texts: string[] = [];
    const aTs = doc.getElementsByTagName("a:t");
    for (let i = 0; i < aTs.length; i++) {
      const el = aTs.item(i);
      if (!el) continue;
      const text = el.textContent?.trim();
      if (text) texts.push(text);
    }
    return texts;
  }

  /**
   * Extract text from a shape element.
   *
   * @param sp - The shape XML element.
   * @returns An array of text strings from a:t elements within the shape.
   */
  private extractShapeText(sp: Element): string[] {
    const texts: string[] = [];
    const aTs = sp.getElementsByTagName("a:t");
    for (let i = 0; i < aTs.length; i++) {
      const el = aTs.item(i);
      if (!el) continue;
      const text = el.textContent?.trim();
      if (text) texts.push(text);
    }
    return texts;
  }

  /**
   * Extract tables from a slide as TableNode AST nodes.
   *
   * @param slideDoc - The parsed slide XML document.
   * @returns An array of TableNode elements found on the slide.
   */
  private extractTables(slideDoc: Document): TableNode[] {
    const tables: TableNode[] = [];
    const tblElements = slideDoc.getElementsByTagName("p:tbl");

    for (let t = 0; t < tblElements.length; t++) {
      const tbl = tblElements.item(t);
      if (!tbl) continue;

      const rows: TableRowNode[] = [];
      const trs = tbl.getElementsByTagName("p:tr");

      for (let i = 0; i < trs.length; i++) {
        const tr = trs.item(i);
        if (!tr) continue;

        const cells: TableCellNode[] = [];
        const tcs = tr.getElementsByTagName("p:tc");

        for (let j = 0; j < tcs.length; j++) {
          const tc = tcs.item(j);
          if (!tc) continue;

          let colspan: number | undefined;
          const gridSpan = tc.getElementsByTagName("a:gridSpan")[0];
          if (gridSpan) {
            const val = parseInt(gridSpan.getAttribute("val") ?? "1", 10);
            if (val > 1) colspan = val;
          }

          // Extract cell text.
          const cellTexts: string[] = [];
          const paragraphs = tc.getElementsByTagName("a:p");
          for (let k = 0; k < paragraphs.length; k++) {
            const p = paragraphs.item(k);
            if (!p) continue;
            const runs = p.getElementsByTagName("a:r");
            let line = "";
            for (let r = 0; r < runs.length; r++) {
              const run = runs.item(r);
              if (!run) continue;
              const tEl = run.getElementsByTagName("a:t")[0];
              if (tEl) line += tEl.textContent ?? "";
            }
            if (line) cellTexts.push(line);
          }

          const cellText = cellTexts.join(" ") || "";
          cells.push(
            createNode<TableCellNode>({
              type: "table-cell",
              children: [
                createNode<TextNode>({ type: "text", value: cellText }),
              ],
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

      if (rows.length > 0) {
        tables.push(
          createNode<TableNode>({
            type: "table",
            children: rows,
          })
        );
      }
    }

    return tables;
  }

  /**
   * Extract a TableData summary from a TableNode.
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
      return (node.children as AnyNode[])
        .map((c) => this.getNodeText(c))
        .join("");
    }
    return "";
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
