export type NodeType =
  | "document"
  | "heading"
  | "paragraph"
  | "table"
  | "table-row"
  | "table-cell"
  | "list"
  | "list-item"
  | "image"
  | "link"
  | "code"
  | "quote"
  | "blockquote"
  | "thematic-break"
  | "html"
  | "text"
  | "emphasis"
  | "strong"
  | "inline-code"
  | "definition"
  | "footnote"
  | "page-break"
  | "section"
  | "strikethrough"
  | "subscript"
  | "superscript"
  | "math"
  | "horizontal-rule"
  | "raw"
  | "callout";

export interface DocumentNode {
  type: NodeType;
  children?: AnyNode[];
  position?: NodePosition;
  [key: string]: unknown;
}

export interface NodePosition {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
  sourceFile?: string;
  pageIndex?: number;
}

export interface HeadingNode extends DocumentNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: AnyNode[];
  id?: string;
}

export interface ParagraphNode extends DocumentNode {
  type: "paragraph";
  children: AnyNode[];
}

export interface TableNode extends DocumentNode {
  type: "table";
  children: TableRowNode[];
  caption?: string;
}

export interface TableRowNode extends DocumentNode {
  type: "table-row";
  children: TableCellNode[];
  isHeader?: boolean;
}

export interface TableCellNode extends DocumentNode {
  type: "table-cell";
  children: AnyNode[];
  colspan?: number;
  rowspan?: number;
}

export interface ListNode extends DocumentNode {
  type: "list";
  ordered: boolean;
  start?: number;
  children: ListItemNode[];
}

export interface ListItemNode extends DocumentNode {
  type: "list-item";
  children: AnyNode[];
}

export interface ImageNode extends DocumentNode {
  type: "image";
  src: string;
  alt?: string;
  title?: string;
  data?: Uint8Array;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface LinkNode extends DocumentNode {
  type: "link";
  href: string;
  title?: string;
  children: AnyNode[];
}

export interface CodeNode extends DocumentNode {
  type: "code";
  language?: string;
  value: string;
}

export interface QuoteNode extends DocumentNode {
  type: "quote";
  children: AnyNode[];
}

export interface BlockquoteNode extends DocumentNode {
  type: "blockquote";
  children: AnyNode[];
}

export interface TextNode extends DocumentNode {
  type: "text";
  value: string;
}

export interface EmphasisNode extends DocumentNode {
  type: "emphasis";
  children: AnyNode[];
}

export interface StrongNode extends DocumentNode {
  type: "strong";
  children: AnyNode[];
}

export interface InlineCodeNode extends DocumentNode {
  type: "inline-code";
  value: string;
}

export interface ThematicBreakNode extends DocumentNode {
  type: "thematic-break";
}

export interface HtmlNode extends DocumentNode {
  type: "html";
  value: string;
}

export interface DefinitionNode extends DocumentNode {
  type: "definition";
  label: string;
  url: string;
  title?: string;
}

export interface FootnoteNode extends DocumentNode {
  type: "footnote";
  identifier: string;
  children: AnyNode[];
}

export interface PageBreakNode extends DocumentNode {
  type: "page-break";
  pageNumber?: number;
}

export interface SectionNode extends DocumentNode {
  type: "section";
  title?: string;
  level?: number;
  children: AnyNode[];
}

export interface StrikethroughNode extends DocumentNode {
  type: "strikethrough";
  children: AnyNode[];
}

export interface MathNode extends DocumentNode {
  type: "math";
  value: string;
  inline?: boolean;
}

export interface HorizontalRuleNode extends DocumentNode {
  type: "horizontal-rule";
}

export interface RawNode extends DocumentNode {
  type: "raw";
  format: string;
  value: string;
}

export interface CalloutNode extends DocumentNode {
  type: "callout";
  calloutType: "note" | "warning" | "tip" | "caution";
  children: AnyNode[];
}

export type AnyNode =
  | DocumentNode
  | HeadingNode
  | ParagraphNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | ListNode
  | ListItemNode
  | ImageNode
  | LinkNode
  | CodeNode
  | QuoteNode
  | BlockquoteNode
  | TextNode
  | EmphasisNode
  | StrongNode
  | InlineCodeNode
  | ThematicBreakNode
  | HtmlNode
  | DefinitionNode
  | FootnoteNode
  | PageBreakNode
  | SectionNode
  | StrikethroughNode
  | MathNode
  | HorizontalRuleNode
  | RawNode
  | CalloutNode;

export function createNode<T extends AnyNode>(node: T): T {
  return node;
}

export function isNodeOfType<T extends AnyNode>(node: AnyNode, type: T["type"]): node is T {
  return node.type === type;
}

export function walkAst(
  node: AnyNode,
  visitor: (node: AnyNode, parent: AnyNode | null) => boolean | void
): void {
  const walk = (n: AnyNode, parent: AnyNode | null): boolean | void => {
    const result = visitor(n, parent);
    if (result === false) return false;
    if ("children" in n && Array.isArray(n.children)) {
      for (const child of n.children) {
        walk(child, n);
      }
    }
  };
  walk(node, null);
}

export function getNodeText(node: AnyNode): string {
  if (node.type === "text") return (node as TextNode).value;
  if (node.type === "code") return (node as CodeNode).value;
  if (node.type === "inline-code") return (node as InlineCodeNode).value;
  if (node.type === "math") return (node as MathNode).value;
  if (node.type === "html") return (node as HtmlNode).value;
  if (node.type === "raw") return (node as RawNode).value;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map((c) => getNodeText(c)).join("");
  }
  return "";
}

export function countTokens(node: AnyNode): number {
  const text = getNodeText(node);
  return text.split(/\s+/).filter(Boolean).length;
}

export function findNodesOfType<T extends AnyNode>(root: AnyNode, type: T["type"]): T[] {
  const results: T[] = [];
  walkAst(root, (node) => {
    if (node.type === type) results.push(node as T);
  });
  return results;
}
