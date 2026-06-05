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

export class PlainTextRenderer {
  render(node: AnyNode): string {
    switch (node.type) {
      case "document": {
        const children = node.children ?? [];
        return children.map((c) => this.render(c)).join("\n\n");
      }
      case "heading": {
        const heading = node as HeadingNode;
        return heading.children.map((c) => this.render(c)).join("");
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
        return emphasis.children.map((c) => this.render(c)).join("");
      }
      case "strong": {
        const strong = node as StrongNode;
        return strong.children.map((c) => this.render(c)).join("");
      }
      case "inline-code": {
        return (node as InlineCodeNode).value;
      }
      case "code": {
        const code = node as CodeNode;
        return code.value;
      }
      case "link": {
        const link = node as LinkNode;
        return link.children.map((c) => this.render(c)).join("");
      }
      case "image": {
        const image = node as ImageNode;
        return image.alt ?? "";
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
        return row.children.map((c) => this.render(c)).join("\t");
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
        return `[${footnote.identifier}]: ${children}`;
      }
      case "page-break":
        return "\n---\n";
      case "section": {
        const section = node as SectionNode;
        return section.children.map((c) => this.render(c)).join("\n\n");
      }
      case "strikethrough": {
        const strikethrough = node as StrikethroughNode;
        return strikethrough.children.map((c) => this.render(c)).join("");
      }
      case "math": {
        return (node as MathNode).value;
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
    return rows
      .map((row) => {
        const cells: string[] = [];
        for (let i = 0; i < columnCount; i++) {
          const cell = row.children[i];
          cells.push(cell ? this.render(cell) : "");
        }
        return cells.join("\t");
      })
      .join("\n");
  }
}
