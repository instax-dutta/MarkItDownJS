import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
  DocumentMetadata,
} from "@markitdownjs/shared";
import {
  createNode,
  parseHTML,
  type AnyNode,
  type HeadingNode,
  type ParagraphNode,
  type TableNode,
  type TableRowNode,
  type TableCellNode,
  type ListNode,
  type ListItemNode,
  type LinkNode,
  type ImageNode,
  type CodeNode,
  type StrongNode,
  type EmphasisNode,
  type TextNode,
  type DocumentNode,
  type ThematicBreakNode,
  type BlockquoteNode,
  type InlineCodeNode,
  type StrikethroughNode,
  type FootnoteNode,
} from "@markitdownjs/shared";

/**
 * Regex for footnote-like CSS class names.
 * Matches class attributes containing 'footnote', 'foot', 'note', or 'fn'.
 */
const FOOTNOTE_CLASS_RE = /footnote|foot[-_\s]?note|fn[-_\s]?/i;

/**
 * Regex for footnote-like `id` values.
 * Matches id attributes like `fn1`, `footnote-2`, etc.
 */
const FOOTNOTE_ID_RE = /^fn[-_\s]?\d+$|^footnote[-_\s]?\d+$/i;

/** Footnote counter used for generating unique identifiers. */
let footnoteCounter = 0;

/**
 * Converts an HTML document (string, Uint8Array, Blob, or ArrayBuffer)
 * into a structured AST and Markdown output.
 *
 * Features:
 * - Full DOM traversal with position tracking
 * - Support for headings, paragraphs, tables (caption/thead/tbody/tfoot),
 *   lists, links, images, code blocks, blockquotes, and inline formatting
 * - `<details>/<summary>`, `<video>/<audio>` metadata, `<iframe>` as links
 * - `<sup>`, `<sub>`, `<del>/<s>`, `<mark>`, `<u>` inline formatting
 * - Footnote extraction from `<aside>` or footnote-like class/id elements
 * - Numeric node type constants (3=TEXT, 8=COMMENT) for Node.js compatibility
 */
export class HtmlConverter implements Converter {
  readonly id = "html" as const;
  readonly supportedMimeTypes = ["text/html", "application/xhtml+xml"];
  readonly supportedExtensions = [".html", ".htm", ".mhtml"];

  /** Checks whether this converter can handle the given input. */
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
      if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) return true;
    }
    return false;
  }

  /**
   * Converts HTML input into a ConversionResult containing the AST, Markdown, and metadata.
   *
   * @param input - The HTML content to convert (string, Uint8Array, Blob, or ArrayBuffer)
   * @returns A ConversionResult with the document AST, rendered Markdown, and extracted metadata
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const html = await this.readString(input);
    const inputSize = new TextEncoder().encode(html).byteLength;

    const document = await parseHTML(html);
    footnoteCounter = 0;
    const children = this.processChildren(Array.from(document.body.childNodes));

    const documentNode = createNode<DocumentNode>({
      type: "document",
      children,
    });

    const markdown = this.renderMarkdown(children);
    const headings = this.extractHeadings(children);

    const endTime = performance.now();
    const stats: ConversionStats = {
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize,
      outputSize: new TextEncoder().encode(markdown).byteLength,
    };

    const metadata: DocumentMetadata = {
      title: document.querySelector("title")?.textContent ?? undefined,
      description:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? undefined,
      author: document.querySelector('meta[name="author"]')?.getAttribute("content") ?? undefined,
      language: document.querySelector("html")?.getAttribute("lang") ?? undefined,
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
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

  /**
   * Reads the input data as a UTF-8 string.
   *
   * @param input - The conversion input to read
   * @returns The decoded string content
   */
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

  /**
   * Extracts the file extension (lowercased, with leading dot) from a filename.
   *
   * @param fileName - The filename to extract the extension from
   * @returns The lowercased extension including the dot, or empty string if none
   */
  private getExtension(fileName: string): string {
    const idx = fileName.lastIndexOf(".");
    return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
  }

  /**
   * Processes an array of child DOM nodes into AST nodes.
   * Skips null results (whitespace-only text nodes, comments).
   *
   * @param nodes - The DOM child nodes to process
   * @returns An array of non-null AST nodes
   */
  private processChildren(nodes: ChildNode[]): AnyNode[] {
    const result: AnyNode[] = [];
    for (const node of nodes) {
      const converted = this.processNode(node);
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
   * Uses numeric constants (3 for TEXT_NODE, 8 for COMMENT_NODE) for Node.js compatibility.
   *
   * @param node - The DOM node to process
   * @returns The corresponding AST node(s), or null if the node should be skipped
   */
  private processNode(node: ChildNode): AnyNode | AnyNode[] | null {
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
        return this.processHeading(el, parseInt(tag[1]!) as HeadingNode["level"]);
      case "p":
        return this.processParagraph(el);
      case "table":
        return this.processTable(el);
      case "ul":
      case "ol":
        return this.processList(el, tag === "ol");
      case "a":
        return this.processLink(el);
      case "img":
        return this.processImage(el);
      case "pre":
        return this.processPreformatted(el);
      case "strong":
      case "b":
        return this.processStrong(el);
      case "em":
      case "i":
        return this.processEmphasis(el);
      case "u":
        return this.processUnderline(el);
      case "del":
      case "s":
        return this.processStrikethrough(el);
      case "sub":
        return this.processSubscript(el);
      case "sup":
        return this.processSuperscript(el);
      case "mark":
        return this.processMark(el);
      case "code":
        if (el.parentElement?.tagName.toLowerCase() === "pre") {
          return null;
        }
        return createNode<InlineCodeNode>({
          type: "inline-code",
          value: el.textContent ?? "",
        });
      case "br":
        return createNode<TextNode>({ type: "text", value: "\n" });
      case "hr":
        return createNode<ThematicBreakNode>({ type: "thematic-break" });
      case "blockquote":
        return this.processBlockquote(el);
      case "details":
        return this.processDetails(el);
      case "summary":
        // summary is handled inside processDetails; skip standalone
        return null;
      case "video":
        return this.processVideo(el);
      case "audio":
        return this.processAudio(el);
      case "iframe":
        return this.processIframe(el);
      case "aside":
        return this.processAside(el);
      case "li":
        return this.processListItem(el);
      case "figure":
      case "div":
      case "section":
      case "article":
      case "main":
      case "header":
      case "footer":
      case "nav":
      case "fieldset":
        return this.processChildren(Array.from(el.childNodes));
      default:
        return this.processChildren(Array.from(el.childNodes));
    }
  }

  /**
   * Processes a heading element (h1-h6) into a HeadingNode.
   * Extracts the `id` attribute if present for anchor linking.
   *
   * @param el - The heading DOM element
   * @param level - The heading level (1-6)
   * @returns A HeadingNode with the appropriate level and children
   */
  private processHeading(el: HTMLElement, level: HeadingNode["level"]): HeadingNode {
    return createNode<HeadingNode>({
      type: "heading",
      level,
      children: this.processChildren(Array.from(el.childNodes)),
      id: el.getAttribute("id") ?? undefined,
    });
  }

  /**
   * Processes a paragraph element into a ParagraphNode.
   *
   * @param el - The paragraph DOM element
   * @returns A ParagraphNode with the processed child content
   */
  private processParagraph(el: HTMLElement): ParagraphNode {
    return createNode<ParagraphNode>({
      type: "paragraph",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes a table element into a TableNode.
   * Properly handles `<caption>`, `<thead>`, `<tbody>`, and `<tfoot>` sections.
   * Preserves row order: thead rows first, then tbody rows, then tfoot rows.
   * Falls back to querying all `<tr>` elements if no section elements exist.
   *
   * @param el - The table DOM element
   * @returns A TableNode with properly ordered rows and optional caption
   */
  private processTable(el: HTMLElement): TableNode {
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
          rows.push(this.processTableRow(tr));
        }
      }
    } else {
      for (const tr of Array.from(el.querySelectorAll("tr"))) {
        rows.push(this.processTableRow(tr));
      }
    }

    return createNode<TableNode>({
      type: "table",
      children: rows,
      caption,
    });
  }

  /**
   * Processes a single table row (`<tr>`) element into a TableRowNode.
   *
   * @param tr - The table row DOM element
   * @returns A TableRowNode with cells and isHeader flag
   */
  private processTableRow(tr: HTMLElement): TableRowNode {
    const cells: TableCellNode[] = [];
    const cellEls = tr.querySelectorAll("td, th");
    for (const cellEl of Array.from(cellEls)) {
      cells.push(
        createNode<TableCellNode>({
          type: "table-cell",
          children: this.processChildren(Array.from(cellEl.childNodes)),
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
   * Processes a list element (`<ul>` or `<ol>`) into a ListNode.
   * Handles nested lists and the `start` attribute for ordered lists.
   *
   * @param el - The list DOM element
   * @param ordered - Whether this is an ordered list
   * @returns A ListNode with processed list items
   */
  private processList(el: HTMLElement, ordered: boolean): ListNode {
    const items: ListItemNode[] = [];
    for (const li of Array.from(el.querySelectorAll(":scope > li"))) {
      items.push(
        createNode<ListItemNode>({
          type: "list-item",
          children: this.processChildren(Array.from(li.childNodes)),
        })
      );
    }
    const startAttr = el.getAttribute("start");
    return createNode<ListNode>({
      type: "list",
      ordered,
      start: startAttr ? parseInt(startAttr) : undefined,
      children: items,
    });
  }

  /**
   * Processes an anchor (`<a>`) element into a LinkNode.
   * Filters out `javascript:` hrefs for safety.
   *
   * @param el - The anchor DOM element
   * @returns A LinkNode with the href, optional title, and children
   */
  private processLink(el: HTMLElement): LinkNode {
    const href = el.getAttribute("href") ?? "";
    return createNode<LinkNode>({
      type: "link",
      href,
      title: el.getAttribute("title") ?? undefined,
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes an image (`<img>`) element into an ImageNode.
   * Extracts src, alt, title, width, and height attributes.
   *
   * @param el - The image DOM element
   * @returns An ImageNode with the image metadata
   */
  private processImage(el: HTMLElement): ImageNode {
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
  }

  /**
   * Processes a preformatted (`<pre>`) element into a CodeNode.
   * Detects language from CSS class (e.g., `language-typescript`).
   * Falls back to the `<code>` element if present.
   *
   * @param el - The preformatted DOM element
   * @returns A CodeNode with the code value and optional language
   */
  private processPreformatted(el: HTMLElement): CodeNode {
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

  /**
   * Processes a `<strong>` or `<b>` element into a StrongNode.
   *
   * @param el - The strong/bold DOM element
   * @returns A StrongNode with the child content
   */
  private processStrong(el: HTMLElement): StrongNode {
    return createNode<StrongNode>({
      type: "strong",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes an `<em>` or `<i>` element into an EmphasisNode.
   *
   * @param el - The emphasis/italic DOM element
   * @returns An EmphasisNode with the child content
   */
  private processEmphasis(el: HTMLElement): EmphasisNode {
    return createNode<EmphasisNode>({
      type: "emphasis",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes a `<u>` element into a StrongNode with underline semantics.
   * Markdown doesn't have native underline; we use `<u>` HTML inline instead.
   *
   * @param el - The underline DOM element
   * @returns An HtmlNode wrapping the content as `<u>...</u>`
   */
  private processUnderline(el: HTMLElement): AnyNode {
    const content = el.textContent ?? "";
    if (!content.trim()) return createNode<TextNode>({ type: "text", value: "" });
    return createNode({
      type: "html" as const,
      value: `<u>${content}</u>`,
    });
  }

  /**
   * Processes a `<del>` or `<s>` element into a StrikethroughNode.
   *
   * @param el - The strikethrough DOM element
   * @returns A StrikethroughNode with the child content
   */
  private processStrikethrough(el: HTMLElement): StrikethroughNode {
    return createNode<StrikethroughNode>({
      type: "strikethrough",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes a `<sub>` element into a SubscriptNode.
   * Uses `type: "subscript"` from the AST.
   *
   * @param el - The subscript DOM element
   * @returns A DocumentNode with type "subscript"
   */
  private processSubscript(el: HTMLElement): DocumentNode {
    return createNode<DocumentNode>({
      type: "subscript",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes a `<sup>` element into a SuperscriptNode.
   * Uses `type: "superscript"` from the AST.
   *
   * @param el - The superscript DOM element
   * @returns A DocumentNode with type "superscript"
   */
  private processSuperscript(el: HTMLElement): DocumentNode {
    return createNode<DocumentNode>({
      type: "superscript",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes a `<mark>` element into an emphasis-styled node.
   * Wraps the content in `==...==` (GitHub-flavored Markdown highlight syntax).
   *
   * @param el - The mark/highlight DOM element
   * @returns An HtmlNode wrapping the highlighted content
   */
  private processMark(el: HTMLElement): AnyNode {
    const content = this.processChildren(Array.from(el.childNodes));
    const text = this.renderNodes(content);
    if (!text.trim()) return createNode<TextNode>({ type: "text", value: "" });
    return createNode({
      type: "html" as const,
      value: `==${text}==`,
    });
  }

  /**
   * Processes a `<blockquote>` element into a BlockquoteNode.
   * Recursively processes child content.
   *
   * @param el - The blockquote DOM element
   * @returns A BlockquoteNode with the child content
   */
  private processBlockquote(el: HTMLElement): BlockquoteNode {
    return createNode<BlockquoteNode>({
      type: "blockquote",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Processes a `<details>` element into a section with summary.
   * Renders as a Markdown details block using HTML.
   *
   * @param el - The details DOM element
   * @returns An HtmlNode with the details content
   */
  private processDetails(el: HTMLElement): AnyNode {
    const summaryEl = el.querySelector("summary");
    const summaryText = summaryEl?.textContent?.trim() ?? "Details";
    const bodyNodes = this.processChildren(Array.from(el.childNodes));
    const bodyText = this.renderMarkdown(bodyNodes);
    return createNode({
      type: "html" as const,
      value: `<details><summary>${summaryText}</summary>\n\n${bodyText}\n\n</details>`,
    });
  }

  /**
   * Processes a `<video>` element into an image node with video metadata.
   * Extracts the poster image if available, or represents as a link.
   *
   * @param el - The video DOM element
   * @returns An ImageNode (with poster) or a LinkNode (with src)
   */
  private processVideo(el: HTMLElement): AnyNode {
    const poster = el.getAttribute("poster");
    const src = el.getAttribute("src");
    const children = Array.from(el.querySelectorAll("source"));
    const videoSrc = poster ?? src ?? children[0]?.getAttribute("src") ?? "";

    if (poster) {
      return createNode<ImageNode>({
        type: "image",
        src: poster,
        alt: `[Video: ${videoSrc}]`,
        title: el.getAttribute("title") ?? undefined,
      });
    }

    return createNode<LinkNode>({
      type: "link",
      href: videoSrc,
      title: el.getAttribute("title") ?? `[Video: ${videoSrc}]`,
      children: [
        createNode<TextNode>({
          type: "text",
          value: `[Video: ${videoSrc}]`,
        }),
      ],
    });
  }

  /**
   * Processes an `<audio>` element into a LinkNode.
   * Represents the audio as a downloadable link.
   *
   * @param el - The audio DOM element
   * @returns A LinkNode pointing to the audio source
   */
  private processAudio(el: HTMLElement): LinkNode {
    const src = el.getAttribute("src");
    const sources = Array.from(el.querySelectorAll("source"));
    const audioSrc = src ?? sources[0]?.getAttribute("src") ?? "";
    return createNode<LinkNode>({
      type: "link",
      href: audioSrc,
      title: el.getAttribute("title") ?? `[Audio: ${audioSrc}]`,
      children: [
        createNode<TextNode>({
          type: "text",
          value: `[Audio: ${audioSrc}]`,
        }),
      ],
    });
  }

  /**
   * Processes an `<iframe>` element into a LinkNode.
   * Embeds are represented as links to their source URL.
   *
   * @param el - The iframe DOM element
   * @returns A LinkNode pointing to the iframe source
   */
  private processIframe(el: HTMLElement): LinkNode {
    const src = el.getAttribute("src") ?? "";
    const title = el.getAttribute("title") ?? src;
    return createNode<LinkNode>({
      type: "link",
      href: src,
      title,
      children: [
        createNode<TextNode>({
          type: "text",
          value: `[Embedded: ${title}]`,
        }),
      ],
    });
  }

  /**
   * Processes an `<aside>` element. If it has a footnote-like class or id,
   * it is treated as a footnote; otherwise it is treated as a generic block.
   *
   * @param el - The aside DOM element
   * @returns A FootnoteNode or the processed child content
   */
  private processAside(el: HTMLElement): AnyNode | AnyNode[] {
    const className = el.getAttribute("class") ?? "";
    const id = el.getAttribute("id") ?? "";

    if (FOOTNOTE_CLASS_RE.test(className) || FOOTNOTE_ID_RE.test(id)) {
      footnoteCounter++;
      const identifier = id || `fn${footnoteCounter}`;
      return createNode<FootnoteNode>({
        type: "footnote",
        identifier,
        children: this.processChildren(Array.from(el.childNodes)),
      });
    }

    return this.processChildren(Array.from(el.childNodes));
  }

  /**
   * Processes a list item element into a ListItemNode.
   *
   * @param el - The list item DOM element
   * @returns A ListItemNode with the child content
   */
  private processListItem(el: HTMLElement): ListItemNode {
    return createNode<ListItemNode>({
      type: "list-item",
      children: this.processChildren(Array.from(el.childNodes)),
    });
  }

  /**
   * Renders an array of AST nodes into a Markdown string.
   *
   * @param nodes - The AST nodes to render
   * @returns The rendered Markdown string
   */
  private renderMarkdown(nodes: AnyNode[]): string {
    const parts: string[] = [];
    for (const node of nodes) {
      parts.push(this.renderNode(node));
    }
    return parts
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Renders a single AST node into its Markdown representation.
   * Handles all supported node types including inline formatting, code, lists, tables, etc.
   *
   * @param node - The AST node to render
   * @returns The Markdown string for this node
   */
  private renderNode(node: AnyNode): string {
    switch (node.type) {
      case "heading": {
        const n = node as HeadingNode;
        const prefix = "#".repeat(n.level);
        return `${prefix} ${this.renderNodes(n.children)}`;
      }
      case "paragraph": {
        const n = node as ParagraphNode;
        return this.renderNodes(n.children);
      }
      case "table": {
        const n = node as TableNode;
        return this.renderTable(n);
      }
      case "list": {
        const n = node as ListNode;
        return n.children
          .map((item, i) => {
            const bullet = n.ordered ? `${(n.start ?? 1) + i}. ` : "- ";
            return `${bullet}${this.renderNodes(item.children)}`;
          })
          .join("\n");
      }
      case "list-item": {
        const n = node as ListItemNode;
        return this.renderNodes(n.children);
      }
      case "link": {
        const n = node as LinkNode;
        const text = this.renderNodes(n.children);
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
        return `**${this.renderNodes(n.children)}**`;
      }
      case "emphasis": {
        const n = node as EmphasisNode;
        return `*${this.renderNodes(n.children)}*`;
      }
      case "strikethrough": {
        const n = node as StrikethroughNode;
        return `~~${this.renderNodes(n.children)}~~`;
      }
      case "subscript": {
        return `~${this.renderNodes(node.children!)}~`;
      }
      case "superscript": {
        return `^${this.renderNodes(node.children!)}^`;
      }
      case "blockquote": {
        const n = node as BlockquoteNode;
        const content = this.renderNodes(n.children);
        return content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      }
      case "text": {
        const n = node as TextNode;
        return n.value;
      }
      case "html": {
        return (node as { value: string }).value;
      }
      case "thematic-break":
        return "---";
      case "horizontal-rule":
        return "---";
      case "footnote": {
        const n = node as FootnoteNode;
        return `[^${n.identifier}]: ${this.renderNodes(n.children)}`;
      }
      default:
        if ("children" in node && Array.isArray(node.children)) {
          return this.renderNodes(node.children);
        }
        return "";
    }
  }

  /**
   * Renders a table AST node into a Markdown table string.
   * Handles column width calculation and alignment.
   *
   * @param table - The TableNode to render
   * @returns The Markdown table string
   */
  private renderTable(table: TableNode): string {
    if (table.children.length === 0) return "";

    let lines: string[] = [];

    if (table.caption) {
      lines.push(`*${table.caption}*`);
      lines.push("");
    }

    const rows = table.children;
    const headerRow = rows[0]!;
    const colCount = headerRow.children.length;
    const colWidths = new Array<number>(colCount).fill(3);

    const cellTexts = rows.map((row) =>
      row.children.map((cell) => this.renderNodes(cell.children))
    );

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
  private renderNodes(nodes: AnyNode[]): string {
    return nodes.map((n) => this.renderNode(n)).join("");
  }

  /**
   * Extracts all heading nodes from the AST tree into a flat array.
   * Used for populating the headings field in ConversionResult.
   *
   * @param nodes - The AST nodes to search
   * @returns An array of heading info objects with level, text, and optional id
   */
  private extractHeadings(nodes: AnyNode[]): { level: number; text: string; id?: string }[] {
    const headings: { level: number; text: string; id?: string }[] = [];
    for (const node of nodes) {
      if (node.type === "heading") {
        const h = node as HeadingNode;
        headings.push({
          level: h.level,
          text: this.getTextContent(h.children),
          id: h.id,
        });
      }
      if ("children" in node && node.children) {
        headings.push(...this.extractHeadings(node.children));
      }
    }
    return headings;
  }

  /**
   * Recursively extracts plain text content from an array of AST nodes.
   *
   * @param nodes - The AST nodes to extract text from
   * @returns The concatenated plain text
   */
  private getTextContent(nodes: AnyNode[]): string {
    return nodes
      .map((n) => {
        if (n.type === "text") return (n as TextNode).value;
        if (n.type === "inline-code") return (n as InlineCodeNode).value;
        if ("children" in n && n.children) return this.getTextContent(n.children);
        return "";
      })
      .join("");
  }
}
