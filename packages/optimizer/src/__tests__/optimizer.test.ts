import { describe, it, expect } from "vitest";
import { Optimizer } from "../optimizer.js";
import type { OptimizerRule } from "../types.js";
import { createNode } from "@markitdownjs/shared";
import type {
  AnyNode,
  DocumentNode,
  HtmlNode,
  ImageNode,
  ListNode,
  ListItemNode,
  ParagraphNode,
  TableCellNode,
  TableNode,
  TableRowNode,
  TextNode,
} from "@markitdownjs/shared";

function text(value: string): TextNode {
  return createNode<TextNode>({ type: "text", value });
}

function cell(value: string): TableCellNode {
  return createNode<TableCellNode>({ type: "table-cell", children: [text(value)] });
}

function headerRow(cells: string[]): TableRowNode {
  return createNode<TableRowNode>({ type: "table-row", isHeader: true, children: cells.map(cell) });
}

function dataRow(cells: string[]): TableRowNode {
  return createNode<TableRowNode>({
    type: "table-row",
    isHeader: false,
    children: cells.map(cell),
  });
}

function paragraph(children: AnyNode[]): ParagraphNode {
  return createNode<ParagraphNode>({ type: "paragraph", children });
}

function doc(children: AnyNode[]): DocumentNode {
  return createNode<DocumentNode>({ type: "document", children });
}

function run(rule: string | OptimizerRule, ast: DocumentNode): DocumentNode {
  return new Optimizer({ rules: [rule] }).optimize(ast);
}

describe("collapse-repeated-headers", () => {
  it("removes consecutive duplicate header rows", () => {
    const table = createNode<TableNode>({
      type: "table",
      children: [headerRow(["Name", "Age"]), headerRow(["Name", "Age"]), dataRow(["Alice", "30"])],
    });

    const result = run("collapse-repeated-headers", doc([table]));
    const outTable = result.children![0] as TableNode;
    expect(outTable.children).toHaveLength(2);
    expect(outTable.children[0]!.isHeader).toBe(true);
    expect(outTable.children[1]!.isHeader).toBe(false);
  });

  it("keeps non-consecutive repeated headers", () => {
    const table = createNode<TableNode>({
      type: "table",
      children: [headerRow(["Name", "Age"]), dataRow(["Alice", "30"]), headerRow(["Name", "Age"])],
    });

    const result = run("collapse-repeated-headers", doc([table]));
    const outTable = result.children![0] as TableNode;
    expect(outTable.children).toHaveLength(3);
  });

  it("does not mutate the source AST", () => {
    const table = createNode<TableNode>({
      type: "table",
      children: [headerRow(["Name", "Age"]), headerRow(["Name", "Age"]), dataRow(["Alice", "30"])],
    });
    const source = doc([table]);
    const snapshot = JSON.parse(JSON.stringify(source)) as DocumentNode;

    run("collapse-repeated-headers", source);

    expect(JSON.parse(JSON.stringify(source))).toEqual(snapshot);
  });
});

describe("built-in rules", () => {
  it("strip-decorative-images removes tracking pixels", () => {
    const img = createNode<ImageNode>({ type: "image", src: "https://example.com/pixel.gif" });
    const result = run("strip-decorative-images", doc([paragraph([text("a"), img])]));

    const para = result.children![0] as ParagraphNode;
    expect(para.children).toHaveLength(1);
    expect((para.children[0] as TextNode).value).toBe("a");
  });

  it("remove-html-comments strips comment blocks", () => {
    const html = createNode<HtmlNode>({ type: "html", value: "<!-- secret --><p>hi</p>" });
    const result = run("remove-html-comments", doc([html]));

    const cleaned = result.children![0] as HtmlNode;
    expect(cleaned.value).toBe("<p>hi</p>");
  });

  it("deduplicate-list-items removes consecutive identical items", () => {
    const item = (value: string): ListItemNode =>
      createNode<ListItemNode>({ type: "list-item", children: [text(value)] });
    const list = createNode<ListNode>({
      type: "list",
      ordered: false,
      children: [item("a"), item("a"), item("b")],
    });

    const result = run("deduplicate-list-items", doc([list]));
    const outList = result.children![0] as ListNode;
    expect(outList.children).toHaveLength(2);
  });
});

describe("custom rules", () => {
  it("applies a custom rule to non-document nodes", () => {
    const rule: OptimizerRule = {
      name: "replace-text",
      applies: (node: AnyNode) => node.type === "text",
      transform: (node: AnyNode) => ({ ...node, value: "replaced" }) as AnyNode,
    };

    const result = run(rule, doc([paragraph([text("original")])]));
    const para = result.children![0] as ParagraphNode;
    expect((para.children[0] as TextNode).value).toBe("replaced");
  });
});
