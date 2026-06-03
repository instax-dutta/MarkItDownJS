import type {
  AnyNode,
  ConversionResult,
  OutputFormat,
  HeadingNode,
  TextNode,
  CodeNode,
  LinkNode,
  ImageNode,
  ListNode,
  InlineCodeNode,
  HtmlNode,
  TableNode,
  TableRowNode,
  TableCellNode,
} from "@markitdownjs/shared";

export class MarkdownRenderer {
  render(result: ConversionResult, format: OutputFormat = "markdown"): string {
    switch (format) {
      case "markdown":
        return result.markdown;
      case "json":
        return JSON.stringify(result.ast ?? this.toAst(result), null, 2);
      case "plaintext":
        return this.toPlainText(result.markdown);
      case "html":
        return this.markdownToHtml(result.markdown);
      default:
        return result.markdown;
    }
  }

  renderAst(ast: AnyNode): string {
    return this.renderNode(ast);
  }

  private renderNode(node: AnyNode): string {
    switch (node.type) {
      case "document":
        return (node.children ?? []).map((c) => this.renderNode(c)).join("\n\n");
      case "heading": {
        const n = node as HeadingNode;
        return `${"#".repeat(n.level)} ${this.renderChildren(n)}`;
      }
      case "paragraph":
        return this.renderChildren(node);
      case "text": {
        const n = node as TextNode;
        return n.value;
      }
      case "emphasis":
        return `*${this.renderChildren(node)}*`;
      case "strong":
        return `**${this.renderChildren(node)}**`;
      case "inline-code": {
        const n = node as InlineCodeNode;
        return `\`${n.value}\``;
      }
      case "code": {
        const n = node as CodeNode;
        return n.language
          ? `\`\`\`${n.language}\n${n.value}\n\`\`\``
          : `\`\`\`\n${n.value}\n\`\`\``;
      }
      case "link": {
        const n = node as LinkNode;
        return `[${this.renderChildren(n)}](${n.href}${n.title ? ` "${n.title}"` : ""})`;
      }
      case "image": {
        const n = node as ImageNode;
        return `![${n.alt ?? ""}](${n.src}${n.title ? ` "${n.title}"` : ""})`;
      }
      case "list": {
        const n = node as ListNode;
        return (
          n.children
            ?.map((item, i) =>
              n.ordered
                ? `${i + 1}. ${this.renderNode(item)}`
                : `- ${this.renderNode(item)}`
            )
            .join("\n") ?? ""
        );
      }
      case "list-item":
        return this.renderChildren(node);
      case "table":
        return this.renderTable(node as TableNode);
      case "blockquote":
        return (
          this.renderChildren(node)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        );
      case "thematic-break":
        return "---";
      case "html": {
        const n = node as HtmlNode;
        return n.value;
      }
      default:
        return "";
    }
  }

  private renderChildren(node: { children?: AnyNode[] }): string {
    return (node.children ?? []).map((c) => this.renderNode(c)).join("");
  }

  private renderTable(table: TableNode): string {
    const rows = table.children.filter(
      (r): r is TableRowNode => r.type === "table-row"
    );
    if (rows.length === 0) return "";

    const headerRow = rows[0]!;
    const bodyRows = rows.slice(1);

    const headerCells = headerRow.children.map(
      (c) =>
        (c.type === "table-cell"
          ? this.renderChildren(c as TableCellNode)
          : ""
        ).replace(/\|/g, "\\|")
    );
    const separator = headerCells.map(() => "---").join(" | ");
    const headerLine = `| ${headerCells.join(" | ")} |`;

    const bodyLines = bodyRows.map((row) => {
      const cells = row.children.map(
        (c) =>
          (c.type === "table-cell"
            ? this.renderChildren(c as TableCellNode)
            : ""
          ).replace(/\|/g, "\\|")
      );
      return `| ${cells.join(" | ")} |`;
    });

    return [headerLine, separator, ...bodyLines].join("\n");
  }

  private toAst(result: ConversionResult): AnyNode {
    return {
      type: "document",
      children: [],
      metadata: result.metadata,
    };
  }

  private toPlainText(markdown: string): string {
    return markdown
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/`{3}[\s\S]*?`{3}/g, (match) => {
        const lines = match.split("\n").slice(1, -1);
        return lines.join("\n");
      })
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "[$1]")
      .replace(/^[-*+]\s+/gm, "• ")
      .replace(/^>\s+/gm, "")
      .replace(/^---$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private markdownToHtml(markdown: string): string {
    let html = markdown;
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    html = html.replace(
      /`{3}(\w+)?\n([\s\S]*?)`{3}/g,
      '<pre><code class="language-$1">$2</code></pre>'
    );
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>'
    );
    html = html.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" />'
    );
    html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");
    html = html.replace(/^[-*+] (.+)$/gm, "<li>$1</li>");
    const lines = html.split("\n");
    const result: string[] = [];
    let inParagraph = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        if (inParagraph) {
          result.push("</p>");
          inParagraph = false;
        }
        continue;
      }
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<img") ||
        trimmed.startsWith("<a ")
      ) {
        if (inParagraph) {
          result.push("</p>");
          inParagraph = false;
        }
        result.push(trimmed);
      } else {
        if (!inParagraph) {
          result.push("<p>");
          inParagraph = true;
        }
        result.push(trimmed);
      }
    }
    if (inParagraph) result.push("</p>");
    return result.join("\n");
  }
}
