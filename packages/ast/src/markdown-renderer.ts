import {
  AnyNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  EmphasisNode,
  StrongNode,
  InlineCodeNode,
  CodeNode,
  LinkNode,
  ImageNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  BlockquoteNode,
  HtmlNode,
  FootnoteNode,
  SectionNode,
  StrikethroughNode,
  MathNode,
  RawNode,
  getNodeText,
} from "@markitdownjs/shared";

export class MarkdownRenderer {
  render(node: AnyNode): string {
    switch (node.type) {
      case "document": {
        const children = node.children ?? [];
        return children.map((child) => this.render(child)).join("\n\n");
      }
      case "heading": {
        const heading = node as HeadingNode;
        const prefix = "#".repeat(heading.level);
        const children = heading.children.map((c) => this.render(c)).join("");
        return `${prefix} ${children}`;
      }
      case "paragraph": {
        const paragraph = node as ParagraphNode;
        return paragraph.children.map((c) => this.render(c)).join("");
      }
      case "text": {
        return (node as TextNode).value;
      }
      case "emphasis": {
        const emphasis = node as EmphasisNode;
        const children = emphasis.children.map((c) => this.render(c)).join("");
        return `*${children}*`;
      }
      case "strong": {
        const strong = node as StrongNode;
        const children = strong.children.map((c) => this.render(c)).join("");
        return `**${children}**`;
      }
      case "inline-code": {
        return `\`${(node as InlineCodeNode).value}\``;
      }
      case "code": {
        const code = node as CodeNode;
        const lang = code.language ?? "";
        return `\`\`\`${lang}\n${code.value}\n\`\`\``;
      }
      case "link": {
        const link = node as LinkNode;
        const children = link.children.map((c) => this.render(c)).join("");
        const title = link.title ? ` "${link.title}"` : "";
        return `[${children}](${link.href}${title})`;
      }
      case "image": {
        const image = node as ImageNode;
        const alt = image.alt ?? "";
        const title = image.title ? ` "${image.title}"` : "";
        return `![${alt}](${image.src}${title})`;
      }
      case "list": {
        const list = node as ListNode;
        return list.children
          .map((item, index) => {
            const prefix = list.ordered ? `${(list.start ?? 1) + index}. ` : "- ";
            const content = item.children.map((c) => this.render(c)).join("");
            return `${prefix}${content}`;
          })
          .join("\n");
      }
      case "list-item": {
        const listItem = node as ListItemNode;
        return listItem.children.map((c) => this.render(c)).join("");
      }
      case "table": {
        return this.renderTable(node as TableNode);
      }
      case "table-row": {
        const row = node as TableRowNode;
        return "| " + row.children.map((c) => this.render(c)).join(" | ") + " |";
      }
      case "table-cell": {
        const cell = node as TableCellNode;
        return cell.children.map((c) => this.render(c)).join("");
      }
      case "blockquote": {
        const blockquote = node as BlockquoteNode;
        const children = blockquote.children.map((c) => this.render(c)).join("\n");
        return children
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      }
      case "thematic-break":
      case "horizontal-rule":
        return "---";
      case "html": {
        return (node as HtmlNode).value;
      }
      case "footnote": {
        const footnote = node as FootnoteNode;
        const children = footnote.children.map((c) => this.render(c)).join("");
        return `[^${footnote.identifier}]: ${children}`;
      }
      case "page-break":
        return "\n---\n";
      case "section": {
        const section = node as SectionNode;
        const children = section.children.map((c) => this.render(c)).join("\n\n");
        return children;
      }
      case "strikethrough": {
        const strikethrough = node as StrikethroughNode;
        const children = strikethrough.children.map((c) => this.render(c)).join("");
        return `~~${children}~~`;
      }
      case "math": {
        const math = node as MathNode;
        if (math.inline) {
          return `$${math.value}$`;
        }
        return `$$\n${math.value}\n$$`;
      }
      case "raw": {
        return (node as RawNode).value;
      }
      case "definition":
      case "quote":
      case "subscript":
      case "superscript": {
        return getNodeText(node);
      }
      default:
        return "";
    }
  }

  private renderTable(table: TableNode): string {
    const rows = table.children;
    if (rows.length === 0) return "";

    const columnCount = Math.max(...rows.map((r) => r.children.length));
    const widths: number[] = Array.from({ length: columnCount }, () => 0);

    for (const row of rows) {
      for (let i = 0; i < columnCount; i++) {
        const cell = row.children[i];
        if (cell) {
          const text = getNodeText(cell);
          widths[i] = Math.max(widths[i] ?? 0, text.length);
        }
      }
    }

    const lines: string[] = [];
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]!;
      const cells: string[] = [];
      for (let ci = 0; ci < columnCount; ci++) {
        const cell = row.children[ci];
        const text = cell ? getNodeText(cell) : "";
        const width = widths[ci] ?? 0;
        cells.push(text.padEnd(width));
      }
      lines.push("| " + cells.join(" | ") + " |");
      if (row.isHeader) {
        lines.push("| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |");
      }
    }
    return lines.join("\n");
  }
}
