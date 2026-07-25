import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
  HeadingInfo,
  AnyNode,
  DocumentMetadata,
} from "@markitdownjs/shared";
import {
  createNode,
  readInputData,
  parseHTML,
  strictCanConvert,
  checkZipBombRisk,
  type HeadingNode,
  type ParagraphNode,
  type ListNode,
  type ListItemNode,
  type LinkNode,
  type ImageNode,
  type CodeNode,
  type StrongNode,
  type EmphasisNode,
  type TextNode,
  type DocumentNode,
  type TableNode,
  type TableRowNode,
  type TableCellNode,
  type InlineCodeNode,
  type ThematicBreakNode,
  type SectionNode,
} from "@markitdownjs/shared";
import JSZip from "jszip";

/** Known XHTML content file extensions within EPUB archives. */
const XHTML_EXTENSIONS = [".html", ".xhtml", ".htm", ".xml"];

// ─── EPUB Package Structure Types ─────────────────────────────────────────────

/** Metadata parsed from the OPF file (dc:* elements). */
interface OpfMetadata {
  title?: string;
  creator?: string;
  language?: string;
  identifier?: string;
  description?: string;
  subject?: string[];
  date?: string;
  publisher?: string;
  rights?: string;
  /** Additional non-standard metadata fields. */
  custom: Record<string, string>;
}

/** A single item in the OPF manifest (id, href, media-type). */
interface OpfManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

/** A spine item reference pointing to a manifest item by id. */
interface OpfSpineItemref {
  idref: string;
  linear?: string;
}

/** The fully parsed OPF package document. */
interface OpfPackage {
  metadata: OpfMetadata;
  manifest: Map<string, OpfManifestItem>;
  spine: OpfSpineItemref[];
}

// ─── OPF Parsing Helpers ──────────────────────────────────────────────────────

/**
 * Parses the `META-INF/container.xml` file to extract the path to the OPF file.
 *
 * @param zip - The JSZip instance containing the EPUB archive
 * @returns The relative path to the OPF file within the archive
 * @throws If container.xml is missing or does not contain a rootfile element
 */
async function getOpfPathFromContainer(zip: JSZip): Promise<string> {
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new Error("EPUB is missing META-INF/container.xml");
  }

  const containerXml = await containerFile.async("string");
  const doc = await parseXMLString(containerXml);
  const rootfileEl = doc.querySelector("rootfile");
  if (!rootfileEl) {
    throw new Error("container.xml does not contain a <rootfile> element");
  }

  const opfPath = rootfileEl.getAttribute("full-path");
  if (!opfPath) {
    throw new Error("<rootfile> element is missing the full-path attribute");
  }

  return opfPath;
}

/**
 * Parses the OPF (Open Packaging Format) file to extract metadata, manifest, and spine.
 *
 * @param zip - The JSZip instance containing the EPUB archive
 * @param opfPath - The relative path to the OPF file within the archive
 * @returns The parsed OPF package structure
 */
async function parseOpf(zip: JSZip, opfPath: string): Promise<OpfPackage> {
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`OPF file not found at: ${opfPath}`);
  }

  const opfXml = await opfFile.async("string");
  const doc = await parseXMLString(opfXml);
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);

  const metadata = parseMetadata(doc);
  const manifest = parseManifest(doc, opfDir);
  const spine = parseSpine(doc);

  return { metadata, manifest, spine };
}

/**
 * Parses the `<metadata>` section of the OPF document.
 * Extracts Dublin Core (dc:*) elements and additional properties.
 *
 * @param doc - The parsed OPF XML document
 * @returns The extracted metadata
 */
function parseMetadata(doc: Document): OpfMetadata {
  const meta: OpfMetadata = { custom: {} };

  const metaEl = doc.querySelector("metadata");
  if (!metaEl) return meta;

  // Helper: get the first matching element's text content
  const getText = (tag: string): string | undefined => {
    const el = metaEl.querySelector(tag);
    return el?.textContent?.trim() || undefined;
  };

  // Helper: get all matching elements' text content
  const getAllText = (tag: string): string[] => {
    return Array.from(metaEl.querySelectorAll(tag))
      .map((el) => el.textContent?.trim())
      .filter((t): t is string => !!t);
  };

  meta.title = getText("dc\\:title") ?? getText("title");
  meta.creator = getText("dc\\:creator") ?? getText("creator");
  meta.language = getText("dc\\:language") ?? getText("language");
  meta.identifier = getText("dc\\:identifier") ?? getText("identifier");
  meta.description = getText("dc\\:description") ?? getText("description");
  meta.date = getText("dc\\:date") ?? getText("date");
  meta.publisher = getText("dc\\:publisher") ?? getText("publisher");
  meta.rights = getText("dc\\:rights") ?? getText("rights");
  meta.subject = [...(getAllText("dc\\:subject") ?? []), ...(getAllText("subject") ?? [])];

  // Additional meta elements
  const allMetaEls = metaEl.querySelectorAll("meta");
  for (const m of Array.from(allMetaEls)) {
    const name = m.getAttribute("name") ?? m.getAttribute("property");
    const content = m.getAttribute("content") ?? m.textContent;
    if (name && content) {
      meta.custom[name] = content.trim();
    }
  }

  return meta;
}

/**
 * Parses the `<manifest>` section of the OPF document.
 * Returns a Map of item id to manifest item for quick lookup.
 *
 * @param doc - The parsed OPF XML document
 * @param opfDir - The directory containing the OPF file (for resolving relative hrefs)
 * @returns A Map from item id to OpfManifestItem
 */
function parseManifest(doc: Document, opfDir: string): Map<string, OpfManifestItem> {
  const manifest = new Map<string, OpfManifestItem>();
  const manifestEl = doc.querySelector("manifest");
  if (!manifestEl) return manifest;

  const items = manifestEl.querySelectorAll("item");
  for (const item of Array.from(items)) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = item.getAttribute("media-type");
    if (id && href && mediaType) {
      const resolvedHref = opfDir + href;
      manifest.set(id, { id, href: resolvedHref, mediaType });
    }
  }

  return manifest;
}

/**
 * Parses the `<spine>` section of the OPF document.
 * Returns the ordered list of item references that define reading order.
 *
 * @param doc - The parsed OPF XML document
 * @returns An array of spine item references
 */
function parseSpine(doc: Document): OpfSpineItemref[] {
  const spine: OpfSpineItemref[] = [];
  const spineEl = doc.querySelector("spine");
  if (!spineEl) return spine;

  const itemrefs = spineEl.querySelectorAll("itemref");
  for (const ref of Array.from(itemrefs)) {
    const idref = ref.getAttribute("idref");
    if (idref) {
      spine.push({
        idref,
        linear: ref.getAttribute("linear") ?? undefined,
      });
    }
  }

  return spine;
}

/**
 * Parses an XML string into a DOM Document using linkedom.
 *
 * @param xmlString - The XML content to parse
 * @returns A Document object representing the parsed XML
 */
async function parseXMLString(xmlString: string): Promise<Document> {
  const DP = await getDOMParser();
  return new DP().parseFromString(xmlString, "application/xml");
}

/**
 * Gets a DOMParser instance, preferring globalThis, then linkedom.
 *
 * @returns A DOMParser constructor
 * @throws If no DOMParser is available
 */
async function getDOMParser(): Promise<{ new (): DOMParser; prototype: DOMParser }> {
  if (typeof globalThis.DOMParser !== "undefined") {
    return globalThis.DOMParser;
  }

  try {
    const mod = await import("linkedom");
    if ((mod as Record<string, unknown>).DOMParser) {
      return (mod as Record<string, unknown>).DOMParser as {
        new (): DOMParser;
        prototype: DOMParser;
      };
    }
  } catch {
    // linkedom not available
  }

  throw new Error(
    "DOMParser is not available. Install 'linkedom' for Node.js support: npm install linkedom"
  );
}

// ─── NCX (Table of Contents) Parsing ──────────────────────────────────────────

/** A single NCX navigation point (chapter/section entry). */
interface NcxNavPoint {
  title: string;
  src: string;
  children: NcxNavPoint[];
}

/**
 * Parses the NCX (table of contents) file from an EPUB archive.
 * Returns navigation points that map chapter titles to content file paths.
 *
 * @param zip - The JSZip instance containing the EPUB
 * @param opf - The parsed OPF package
 * @returns An array of top-level navigation points
 */
async function parseNcx(zip: JSZip, opf: OpfPackage): Promise<NcxNavPoint[]> {
  // Find the NCX file from the manifest.
  let ncxHref: string | undefined;
  for (const item of opf.manifest.values()) {
    if (item.mediaType === "application/x-dtbncx+xml") {
      ncxHref = item.href;
      break;
    }
  }
  if (!ncxHref) return [];

  const ncxFile = zip.file(ncxHref);
  if (!ncxFile) return [];

  const ncxXml = await ncxFile.async("string");
  const doc = await parseXMLString(ncxXml);

  const navPoints = doc.querySelectorAll("navMap > navPoint");
  return Array.from(navPoints).map((np) => parseNavPoint(np, ncxHref!));
}

/**
 * Recursively parses a navPoint element into an NcxNavPoint.
 */
function parseNavPoint(el: Element, _ncxDir: string): NcxNavPoint {
  const titleEl = el.querySelector("navLabel > text");
  const contentEl = el.querySelector("content");
  const title = titleEl?.textContent?.trim() ?? "";
  const src = contentEl?.getAttribute("src") ?? "";

  const childPoints = Array.from(el.querySelectorAll(":scope > navPoint"))
    .map((child) => parseNavPoint(child, _ncxDir));

  return { title, src, children: childPoints };
}

/**
 * Strips the fragment identifier from a URL (e.g., "chapter1.xhtml#sec1" → "chapter1.xhtml").
 */
function stripFragment(src: string): string {
  const hashIdx = src.indexOf("#");
  return hashIdx >= 0 ? src.substring(0, hashIdx) : src;
}

// ─── XHTML Content Processing ─────────────────────────────────────────────────

/**
 * Recursively processes the child nodes of a DOM element into AST nodes.
 * Replaces `document.createTreeWalker` with recursive traversal for Node.js compatibility.
 *
 * @param nodes - The DOM child nodes to process
 * @returns An array of AST nodes
 */
function processChildNodes(nodes: ChildNode[]): AnyNode[] {
  const result: AnyNode[] = [];
  for (const node of nodes) {
    const converted = processSingleNode(node);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }
  return result;
}

/**
 * Processes a single DOM node into an AST node or array of AST nodes.
 * Uses numeric constants (3=TEXT_NODE, 8=COMMENT_NODE) for Node.js compatibility.
 *
 * @param node - The DOM node to process
 * @returns The corresponding AST node(s), or null if the node should be skipped
 */
function processSingleNode(node: ChildNode): AnyNode | AnyNode[] | null {
  // Node.TEXT_NODE = 3, Node.COMMENT_NODE = 8
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    if (!text.trim()) return null;
    return createNode<TextNode>({ type: "text", value: text });
  }
  if (node.nodeType === 8) return null;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return createNode<HeadingNode>({
        type: "heading",
        level: parseInt(tag[1]!) as HeadingNode["level"],
        children: processChildNodes(Array.from(el.childNodes)),
        id: el.getAttribute("id") ?? undefined,
      });

    case "p":
      return createNode<ParagraphNode>({
        type: "paragraph",
        children: processChildNodes(Array.from(el.childNodes)),
      });

    case "table":
      return processTableElement(el);

    case "ul":
    case "ol":
      return createNode<ListNode>({
        type: "list",
        ordered: tag === "ol",
        start: tag === "ol" ? parseInt(el.getAttribute("start") ?? "1") || 1 : undefined,
        children: processListItems(el),
      });

    case "a":
      return createNode<LinkNode>({
        type: "link",
        href: el.getAttribute("href") ?? "",
        title: el.getAttribute("title") ?? undefined,
        children: processChildNodes(Array.from(el.childNodes)),
      });

    case "img":
      return createNode<ImageNode>({
        type: "image",
        src: el.getAttribute("src") ?? "",
        alt: el.getAttribute("alt") ?? undefined,
        title: el.getAttribute("title") ?? undefined,
        width: el.hasAttribute("width")
          ? parseInt(el.getAttribute("width") ?? "0") || undefined
          : undefined,
        height: el.hasAttribute("height")
          ? parseInt(el.getAttribute("height") ?? "0") || undefined
          : undefined,
      });

    case "pre": {
      const codeEl = el.querySelector("code");
      const text = (codeEl ?? el).textContent ?? "";
      const className = codeEl?.className ?? el.className;
      const langMatch = className.match(/language-(\w+)/);
      return createNode<CodeNode>({
        type: "code",
        language: langMatch?.[1] ?? undefined,
        value: text,
      });
    }

    case "code":
      if (el.parentElement?.tagName.toLowerCase() === "pre") return null;
      return createNode<InlineCodeNode>({
        type: "inline-code",
        value: el.textContent ?? "",
      });

    case "strong":
    case "b":
      return createNode<StrongNode>({
        type: "strong",
        children: processChildNodes(Array.from(el.childNodes)),
      });

    case "em":
    case "i":
      return createNode<EmphasisNode>({
        type: "emphasis",
        children: processChildNodes(Array.from(el.childNodes)),
      });

    case "br":
      return createNode<TextNode>({ type: "text", value: "\n" });

    case "hr":
      return createNode<ThematicBreakNode>({ type: "thematic-break" });

    case "blockquote":
      return createNode({
        type: "blockquote" as const,
        children: processChildNodes(Array.from(el.childNodes)),
      });

    case "div":
    case "section":
    case "article":
    case "aside":
    case "figure":
    case "figcaption":
    case "span":
    case "header":
    case "footer":
    case "nav":
      return processChildNodes(Array.from(el.childNodes));

    default:
      return processChildNodes(Array.from(el.childNodes));
  }
}

/**
 * Processes a table element, handling thead/tbody/tfoot sections.
 *
 * @param el - The table DOM element
 * @returns A TableNode with processed rows
 */
function processTableElement(el: HTMLElement): TableNode {
  const rows: TableRowNode[] = [];
  let caption: string | undefined;

  const captionEl = el.querySelector("caption");
  if (captionEl) {
    caption = captionEl.textContent?.trim() || undefined;
  }

  const thead = el.querySelector("thead");
  const tbody = el.querySelector("tbody");
  const tfoot = el.querySelector("tfoot");

  if (thead || tbody || tfoot) {
    const sections = [thead, tbody, tfoot].filter(Boolean) as HTMLElement[];
    for (const section of sections) {
      for (const tr of Array.from(section.querySelectorAll("tr"))) {
        rows.push(processTableRowElement(tr));
      }
    }
  } else {
    for (const tr of Array.from(el.querySelectorAll("tr"))) {
      rows.push(processTableRowElement(tr));
    }
  }

  return createNode<TableNode>({ type: "table", children: rows, caption });
}

/**
 * Processes a table row element into a TableRowNode.
 *
 * @param tr - The table row DOM element
 * @returns A TableRowNode with cells
 */
function processTableRowElement(tr: HTMLElement): TableRowNode {
  const cells: TableCellNode[] = [];
  const cellEls = tr.querySelectorAll("td, th");
  for (const cellEl of Array.from(cellEls)) {
    cells.push(
      createNode<TableCellNode>({
        type: "table-cell",
        children: processChildNodes(Array.from(cellEl.childNodes)),
        colspan: cellEl.hasAttribute("colspan")
          ? parseInt(cellEl.getAttribute("colspan") ?? "1")
          : undefined,
        rowspan: cellEl.hasAttribute("rowspan")
          ? parseInt(cellEl.getAttribute("rowspan") ?? "1")
          : undefined,
      })
    );
  }
  return createNode<TableRowNode>({
    type: "table-row",
    children: cells,
    isHeader: tr.querySelector("th") !== null,
  });
}

/**
 * Processes the direct `<li>` children of a list element.
 *
 * @param listEl - The list DOM element (ul or ol)
 * @returns An array of ListItemNode
 */
function processListItems(listEl: HTMLElement): ListItemNode[] {
  const items: ListItemNode[] = [];
  for (const li of Array.from(listEl.querySelectorAll(":scope > li"))) {
    items.push(
      createNode<ListItemNode>({
        type: "list-item",
        children: processChildNodes(Array.from(li.childNodes)),
      })
    );
  }
  return items;
}

// ─── Markdown Renderer ─────────────────────────────────────────────────────────

/**
 * Renders an array of AST nodes into a Markdown string.
 * This is the local renderMarkdown helper for the EPUB converter.
 *
 * @param nodes - The AST nodes to render
 * @returns The rendered Markdown string
 */
function renderMarkdown(nodes: AnyNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    parts.push(renderNode(node));
  }
  return parts
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Renders a single AST node into its Markdown representation.
 *
 * @param node - The AST node to render
 * @returns The Markdown string for this node
 */
function renderNode(node: AnyNode): string {
  switch (node.type) {
    case "heading": {
      const n = node as HeadingNode;
      const prefix = "#".repeat(n.level);
      return `${prefix} ${renderNodes(n.children)}`;
    }
    case "paragraph": {
      const n = node as ParagraphNode;
      return renderNodes(n.children);
    }
    case "table": {
      return renderTable(node as TableNode);
    }
    case "list": {
      const n = node as ListNode;
      return n.children
        .map((item, i) => {
          const bullet = n.ordered ? `${(n.start ?? 1) + i}. ` : "- ";
          return `${bullet}${renderNodes(item.children)}`;
        })
        .join("\n");
    }
    case "list-item": {
      const n = node as ListItemNode;
      return renderNodes(n.children);
    }
    case "link": {
      const n = node as LinkNode;
      const text = renderNodes(n.children);
      return n.title ? `[${text}](${n.href} "${n.title}")` : `[${text}](${n.href})`;
    }
    case "image": {
      const n = node as ImageNode;
      return `![${n.alt ?? ""}](${n.src}${n.title ? ` "${n.title}"` : ""})`;
    }
    case "code": {
      const n = node as CodeNode;
      return "```" + (n.language ?? "") + "\n" + n.value + "\n```";
    }
    case "inline-code": {
      const n = node as InlineCodeNode;
      return `\`${n.value}\``;
    }
    case "strong": {
      const n = node as StrongNode;
      return `**${renderNodes(n.children)}**`;
    }
    case "emphasis": {
      const n = node as EmphasisNode;
      return `*${renderNodes(n.children)}*`;
    }
    case "blockquote": {
      const n = node as { children: AnyNode[] };
      const content = renderNodes(n.children);
      return content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "text": {
      const n = node as TextNode;
      return n.value;
    }
    case "thematic-break":
      return "---";
    case "section": {
      const n = node as SectionNode;
      const parts: string[] = [];
      if (n.title) {
        parts.push(`## ${n.title}`);
      }
      if (n.children) {
        parts.push(renderNodes(n.children));
      }
      return parts.join("\n\n");
    }
    default:
      if ("children" in node && Array.isArray(node.children)) {
        return renderNodes(node.children);
      }
      return "";
  }
}

/**
 * Renders a table node into a Markdown table string.
 *
 * @param table - The TableNode to render
 * @returns The Markdown table string
 */
function renderTable(table: TableNode): string {
  if (table.children.length === 0) return "";

  let lines: string[] = [];
  if (table.caption) {
    lines.push(`*${table.caption}*`);
    lines.push("");
  }

  const rows = table.children;
  const colCount = rows[0]?.children.length ?? 0;
  const colWidths = new Array<number>(colCount).fill(3);

  const cellTexts = rows.map((row) => row.children.map((cell) => renderNodes(cell.children)));

  for (const row of cellTexts) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i]!, row[i]!.length);
    }
  }

  for (let r = 0; r < cellTexts.length; r++) {
    const cells = cellTexts[r]!;
    const line = "| " + cells.map((c, i) => c.padEnd(colWidths[i]!)).join(" | ") + " |";
    lines.push(line);
    if (r === 0) {
      lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |");
    }
  }

  return lines.join("\n");
}

/**
 * Recursively renders an array of AST nodes into a single string.
 *
 * @param nodes - The AST nodes to render
 * @returns The concatenated rendered output
 */
function renderNodes(nodes: AnyNode[]): string {
  return nodes.map((n) => renderNode(n)).join("");
}

// ─── EpubConverter ─────────────────────────────────────────────────────────────

/**
 * Converts EPUB e-book files into AST and Markdown output.
 *
 * Key features:
 * - Parses `META-INF/container.xml` to locate the OPF file
 * - Extracts metadata (title, creator, language, etc.) from the OPF
 * - Reads content files in SPINE ORDER (not alphabetical)
 * - Recursively traverses XHTML content without `document.createTreeWalker`
 * - Produces a complete DocumentNode AST with all content in correct reading order
 * - Renders headings, paragraphs, lists, tables, links, images, and code blocks
 *
 * @example
 * ```ts
 * const converter = new EpubConverter();
 * const result = await converter.convert({ data: epubBuffer });
 * console.log(result.ast); // DocumentNode AST
 * console.log(result.markdown); // Rendered Markdown
 * ```
 */
export class EpubConverter implements Converter {
  readonly id = "epub";
  readonly supportedMimeTypes = ["application/epub+zip"];
  readonly supportedExtensions = [".epub"];

  /**
   * Checks whether this converter can handle the given input.
   * Validates MIME type, file extension, and ZIP magic bytes.
   *
   * @param input - The conversion input to check
   * @returns True if this converter can process the input
   */
  async canConvert(input: ConversionInput): Promise<boolean> {
    // Strict dispatch: ZIP magic bytes are shared across .docx/.xlsx/.pptx/.epub —
    // sniffing them here would cause this converter to intercept other formats.
    return strictCanConvert(input, {
      mimeTypes: this.supportedMimeTypes,
      extensions: this.supportedExtensions,
    });
  }

  /**
   * Converts an EPUB file into a ConversionResult with AST and Markdown.
   *
   * Processing steps:
   * 1. Parse the ZIP archive
   * 2. Read `META-INF/container.xml` to find the OPF path
   * 3. Parse the OPF for metadata, manifest, and spine
   * 4. Read XHTML files in spine order
   * 5. Parse each XHTML into AST nodes
   * 6. Build the complete document AST and render to Markdown
   *
   * @param input - The EPUB file as Uint8Array, ArrayBuffer, Blob, or string
   * @returns A ConversionResult with the document AST, Markdown, and metadata
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const data = await readInputData(input.data);

    const zip = await JSZip.loadAsync(data);
    checkZipBombRisk(zip);

    // Step 1: Find OPF path from container.xml
    const opfPath = await getOpfPathFromContainer(zip);

    // Step 2: Parse OPF for metadata, manifest, spine
    const opf = await parseOpf(zip, opfPath);

    // Step 3: Identify spine content items (filter to XHTML)
    const spineContentItems: OpfManifestItem[] = [];
    for (const spineRef of opf.spine) {
      const item = opf.manifest.get(spineRef.idref);
      if (item) {
        const ext = item.href.substring(item.href.lastIndexOf(".")).toLowerCase();
        if (XHTML_EXTENSIONS.some((xhtmlExt) => ext === xhtmlExt)) {
          spineContentItems.push(item);
        }
      }
    }

    // Step 3.5: Parse NCX for chapter boundaries.
    const ncxNavPoints = await parseNcx(zip, opf);

    // Build a map from content file path → chapter title (from NCX).
    const chapterTitles = new Map<string, string>();
    const buildChapterMap = (points: NcxNavPoint[]) => {
      for (const point of points) {
        const contentFile = stripFragment(point.src);
        if (contentFile && !chapterTitles.has(contentFile)) {
          chapterTitles.set(contentFile, point.title);
        }
        buildChapterMap(point.children);
      }
    };
    buildChapterMap(ncxNavPoints);

    // Step 4: Process each XHTML content file in spine order
    const allChildren: AnyNode[] = [];
    const headings: HeadingInfo[] = [];

    for (const item of spineContentItems) {
      const file = zip.file(item.href);
      if (!file) continue;

      const content = await file.async("string");
      const doc = await parseHTML(content);
      const body = doc.body;
      if (!body) continue;

      const chapterNodes = processChildNodes(Array.from(body.childNodes));

      // Filter out blank/boilerplate pages (pages with no meaningful text).
      const textContent = chapterNodes
        .map((n) => extractNodeText(n))
        .join("")
        .trim();
      if (textContent.length < 10) continue; // Skip blank pages

      // Collect headings for the ConversionResult
      for (const node of chapterNodes) {
        if (node.type === "heading") {
          const h = node as HeadingNode;
          headings.push({
            level: h.level,
            text: extractNodeText(h),
            id: h.id,
          });
        }
      }

      // Wrap in SectionNode if we have a chapter title from NCX.
      const href = item.href;
      const chapterTitle = chapterTitles.get(href);
      if (chapterTitle && chapterNodes.length > 0) {
        allChildren.push(
          createNode<SectionNode>({
            type: "section",
            title: chapterTitle,
            children: chapterNodes,
          })
        );
      } else {
        allChildren.push(...chapterNodes);
      }
    }

    // Step 5: Build the complete document node
    const documentNode = createNode<DocumentNode>({
      type: "document",
      children: allChildren,
    });

    // Step 6: Render to Markdown
    const markdown = renderMarkdown(allChildren);

    // Step 7: Build metadata from OPF
    const metadata: DocumentMetadata = {
      title: opf.metadata.title,
      author: opf.metadata.creator,
      language: opf.metadata.language,
      description: opf.metadata.description,
      createdAt: opf.metadata.date,
      keywords:
        opf.metadata.subject && opf.metadata.subject.length > 0 ? opf.metadata.subject : undefined,
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
      customProperties: {
        identifier: opf.metadata.identifier,
        publisher: opf.metadata.publisher,
        rights: opf.metadata.rights,
        ...opf.metadata.custom,
      },
    };

    const endTime = performance.now();
    const stats: ConversionStats = {
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize: data.length,
      outputSize: new TextEncoder().encode(markdown).byteLength,
    };

    return {
      markdown,
      metadata,
      assets: [],
      tables: [],
      images: [],
      headings,
      ast: documentNode,
      format: "markdown",
      converterId: this.id,
      stats,
    };
  }
}

/**
 * Extracts plain text from an AST node by recursively walking its children.
 *
 * @param node - The AST node to extract text from
 * @returns The concatenated plain text content
 */
function extractNodeText(node: AnyNode): string {
  if (node.type === "text") return (node as TextNode).value;
  if (node.type === "inline-code") return (node as InlineCodeNode).value;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map((c) => extractNodeText(c)).join("");
  }
  return "";
}
