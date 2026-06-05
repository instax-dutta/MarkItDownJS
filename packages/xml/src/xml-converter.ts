import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
  DocumentMetadata,
} from "@markitdownjs/shared";
import {
  createNode,
  parseXML,
  serializeXML,
  type AnyNode,
  type HeadingNode,
  type CodeNode,
  type ParagraphNode,
  type TextNode,
  type DocumentNode,
} from "@markitdownjs/shared";

export class XmlConverter implements Converter {
  readonly id = "xml" as const;
  readonly supportedMimeTypes = [
    "application/xml",
    "text/xml",
    "application/rss+xml",
    "application/atom+xml",
  ];
  readonly supportedExtensions = [".xml", ".rss", ".atom"];

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
      if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) return true;
    }
    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const text = await this.readString(input);
    const inputSize = new TextEncoder().encode(text).byteLength;

    const document = await parseXML(text);
    const parseError = document.querySelector("parsererror");
    if (parseError) {
      throw new Error(`XML parse error: ${parseError.textContent ?? "unknown error"}`);
    }

    const children: AnyNode[] = [];
    const rootTag = document.documentElement?.tagName.toLowerCase() ?? "";

    const isFeed = rootTag === "rss" || rootTag === "feed" || rootTag === "rdf";

    if (isFeed) {
      children.push(
        createNode<HeadingNode>({
          type: "heading",
          level: 2,
          children: [
            createNode<TextNode>({ type: "text", value: this.extractFeedTitle(document, rootTag) }),
          ],
        })
      );

      const entries = this.extractFeedEntries(document, rootTag);
      for (const entry of entries) {
        children.push(
          createNode<HeadingNode>({
            type: "heading",
            level: 3,
            children: [createNode<TextNode>({ type: "text", value: entry.title })],
          })
        );
        if (entry.link) {
          children.push(
            createNode<ParagraphNode>({
              type: "paragraph",
              children: [createNode<TextNode>({ type: "text", value: `Link: ${entry.link}` })],
            })
          );
        }
        if (entry.description) {
          children.push(
            createNode<ParagraphNode>({
              type: "paragraph",
              children: [createNode<TextNode>({ type: "text", value: entry.description })],
            })
          );
        }
      }
    }

    const serialized = serializeXML(document);
    const prettyXml = this.prettifyXml(serialized);

    children.push(
      createNode<HeadingNode>({
        type: "heading",
        level: 2,
        children: [createNode<TextNode>({ type: "text", value: "XML Source" })],
      })
    );

    children.push(
      createNode<CodeNode>({
        type: "code",
        language: "xml",
        value: prettyXml,
      })
    );

    const documentNode = createNode<DocumentNode>({
      type: "document",
      children,
    });

    const markdown = this.renderMarkdown(children);
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
      tables: [],
      images: [],
      headings: children
        .filter((n): n is AnyNode & { type: "heading" } => n.type === "heading")
        .map((h) => ({
          level: (h as HeadingNode).level,
          text: this.getTextContent((h as HeadingNode).children),
        })),
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

  private extractFeedTitle(doc: Document, rootTag: string): string {
    if (rootTag === "rss") {
      return doc.querySelector("channel > title")?.textContent ?? "RSS Feed";
    }
    if (rootTag === "feed") {
      return doc.querySelector("feed > title")?.textContent ?? "Atom Feed";
    }
    return doc.documentElement?.getAttribute("rdf:about") ?? "XML Feed";
  }

  private extractFeedEntries(
    doc: Document,
    rootTag: string
  ): { title: string; link: string; description: string }[] {
    const entries: { title: string; link: string; description: string }[] = [];

    if (rootTag === "rss") {
      const items = doc.querySelectorAll("item");
      for (const item of Array.from(items)) {
        entries.push({
          title: item.querySelector("title")?.textContent ?? "Untitled",
          link: item.querySelector("link")?.textContent ?? "",
          description: item.querySelector("description")?.textContent ?? "",
        });
      }
    } else if (rootTag === "feed") {
      const entries_els = doc.querySelectorAll("entry");
      for (const entry of Array.from(entries_els)) {
        const linkEl = entry.querySelector("link");
        entries.push({
          title: entry.querySelector("title")?.textContent ?? "Untitled",
          link: linkEl?.getAttribute("href") ?? linkEl?.textContent ?? "",
          description: entry.querySelector("summary, content")?.textContent ?? "",
        });
      }
    } else if (rootTag === "rdf") {
      const items = doc.querySelectorAll("item");
      for (const item of Array.from(items)) {
        entries.push({
          title: item.querySelector("title")?.textContent ?? "Untitled",
          link: item.querySelector("link")?.textContent ?? "",
          description: item.querySelector("description")?.textContent ?? "",
        });
      }
    }

    return entries;
  }

  private prettifyXml(xml: string): string {
    let formatted = "";
    let indent = 0;
    const parts = xml.replace(/(>)(<)(\/*)/g, "$1\n$2$3").split("\n");

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("</")) {
        indent = Math.max(0, indent - 1);
      }

      formatted += "  ".repeat(indent) + trimmed + "\n";

      if (
        trimmed.startsWith("<") &&
        !trimmed.startsWith("</") &&
        !trimmed.startsWith("<?") &&
        !trimmed.endsWith("/>") &&
        !/<[^/][^>]*>/.test(trimmed)
      ) {
        indent++;
      }
    }

    return formatted.trim();
  }

  private renderMarkdown(nodes: AnyNode[]): string {
    return nodes
      .map((n) => this.renderNode(n))
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private renderNode(node: AnyNode): string {
    switch (node.type) {
      case "heading": {
        const n = node as HeadingNode;
        return "#".repeat(n.level) + " " + this.getTextContent(n.children);
      }
      case "paragraph": {
        const n = node as ParagraphNode;
        return this.getTextContent(n.children);
      }
      case "code": {
        const n = node as CodeNode;
        return "```" + (n.language ?? "") + "\n" + n.value + "\n```";
      }
      case "text": {
        return (node as TextNode).value;
      }
      default:
        return "";
    }
  }

  private getTextContent(nodes: AnyNode[]): string {
    return nodes
      .map((n) => {
        if (n.type === "text") return (n as TextNode).value;
        if ("children" in n && n.children) return this.getTextContent(n.children);
        return "";
      })
      .join("");
  }
}
