import { describe, it, expect } from "vitest";
import { MarkdownRenderer } from "../renderer.js";
import { createNode } from "@markitdownjs/shared";
import type {
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ImageNode,
  CodeNode,
  StrongNode,
  EmphasisNode,
} from "@markitdownjs/shared";

describe("MarkdownRenderer", () => {
  const renderer = new MarkdownRenderer();

  it("should render headings", () => {
    const node = createNode<HeadingNode>({
      type: "heading",
      level: 1,
      children: [createNode<TextNode>({ type: "text", value: "Title" })],
    });
    expect(renderer.renderAst(node)).toBe("# Title");
  });

  it("should render paragraphs", () => {
    const node = createNode<ParagraphNode>({
      type: "paragraph",
      children: [createNode<TextNode>({ type: "text", value: "Hello world" })],
    });
    expect(renderer.renderAst(node)).toBe("Hello world");
  });

  it("should render bold text", () => {
    const node = createNode<StrongNode>({
      type: "strong",
      children: [createNode<TextNode>({ type: "text", value: "bold" })],
    });
    expect(renderer.renderAst(node)).toBe("**bold**");
  });

  it("should render italic text", () => {
    const node = createNode<EmphasisNode>({
      type: "emphasis",
      children: [createNode<TextNode>({ type: "text", value: "italic" })],
    });
    expect(renderer.renderAst(node)).toBe("*italic*");
  });

  it("should render links", () => {
    const node = createNode<LinkNode>({
      type: "link",
      href: "https://example.com",
      children: [createNode<TextNode>({ type: "text", value: "Example" })],
    });
    expect(renderer.renderAst(node)).toBe("[Example](https://example.com)");
  });

  it("should render images", () => {
    const node = createNode<ImageNode>({
      type: "image",
      src: "image.png",
      alt: "An image",
    });
    expect(renderer.renderAst(node)).toBe("![An image](image.png)");
  });

  it("should render code blocks", () => {
    const node = createNode<CodeNode>({
      type: "code",
      language: "typescript",
      value: "const x = 1;",
    });
    expect(renderer.renderAst(node)).toContain("typescript");
    expect(renderer.renderAst(node)).toContain("const x = 1;");
  });

  it("should render tables", () => {
    const node = createNode<TableNode>({
      type: "table",
      children: [
        createNode<TableRowNode>({
          type: "table-row",
          isHeader: true,
          children: [
            createNode<TableCellNode>({
              type: "table-cell",
              children: [createNode<TextNode>({ type: "text", value: "Name" })],
            }),
          ],
        }),
        createNode<TableRowNode>({
          type: "table-row",
          children: [
            createNode<TableCellNode>({
              type: "table-cell",
              children: [createNode<TextNode>({ type: "text", value: "John" })],
            }),
          ],
        }),
      ],
    });
    const md = renderer.renderAst(node);
    expect(md).toContain("| Name |");
    expect(md).toContain("---");
    expect(md).toContain("| John |");
  });

  it("should render lists", () => {
    const node = createNode<ListNode>({
      type: "list",
      ordered: false,
      children: [
        createNode<ListItemNode>({
          type: "list-item",
          children: [createNode<TextNode>({ type: "text", value: "Item 1" })],
        }),
        createNode<ListItemNode>({
          type: "list-item",
          children: [createNode<TextNode>({ type: "text", value: "Item 2" })],
        }),
      ],
    });
    const md = renderer.renderAst(node);
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
  });

  it("should render document nodes", () => {
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<HeadingNode>({
          type: "heading",
          level: 1,
          children: [createNode<TextNode>({ type: "text", value: "Title" })],
        }),
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [createNode<TextNode>({ type: "text", value: "Content" })],
        }),
      ],
    });
    const md = renderer.renderAst(doc);
    expect(md).toContain("# Title");
    expect(md).toContain("Content");
  });
});
