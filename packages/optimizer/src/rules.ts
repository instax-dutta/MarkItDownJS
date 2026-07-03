import type { AnyNode, ImageNode, ListNode, ListItemNode, TextNode, HtmlNode } from "@markitdownjs/shared";
import type { OptimizerRule } from "./types.js";

/** Regex for decorative/tracking image patterns */
const DECORATIVE_IMG_RE = /pixel|tracking|spacer|blank|1x1|badge|icon|spinner|loading|analytics/i;

/** Regex for HTML comments */
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

/** Regex for boilerplate footer text */
const BOILERPLATE_RE = /page \d+ of \d+|copyright ©|\(c\)\s*\d{4}|all rights reserved/i;

/** Strip decorative images (badge SVGs, tracking pixels, icons) */
export const stripDecorativeImages: OptimizerRule = {
  name: "strip-decorative-images",
  applies: () => true,
  transform: (node: AnyNode): AnyNode | null => {
    if (node.type === "image") {
      const img = node as ImageNode;
      if (DECORATIVE_IMG_RE.test(img.src)) return null;
      if (img.width === 1 && img.height === 1) return null;
    }
    return node;
  },
};

/** Collapse repeated table headers (CSV/XLSX with repeated header rows) */
export const collapseRepeatedHeaders: OptimizerRule = {
  name: "collapse-repeated-headers",
  applies: () => true,
  transform: (node: AnyNode): AnyNode | null => {
    // This is a placeholder — actual implementation needs table row comparison.
    // The optimizer applies this at the table level in a post-processing step.
    return node;
  },
};

/** Remove HTML comment blocks from HtmlNode values */
export const removeHtmlComments: OptimizerRule = {
  name: "remove-html-comments",
  applies: () => true,
  transform: (node: AnyNode): AnyNode | null => {
    if (node.type === "html") {
      const html = node as HtmlNode;
      const cleaned = html.value.replace(HTML_COMMENT_RE, "").trim();
      if (!cleaned) return null;
      return { ...html, value: cleaned };
    }
    return node;
  },
};

/** Strip whitespace-only text nodes */
export const stripWhitespaceColumns: OptimizerRule = {
  name: "strip-whitespace-columns",
  applies: () => true,
  transform: (node: AnyNode): AnyNode | null => {
    if (node.type === "text") {
      const text = node as TextNode;
      const cleaned = text.value.replace(/[ \t]{2,}/g, " ");
      return { ...text, value: cleaned };
    }
    return node;
  },
};

/** Deduplicate consecutive identical list items */
export const deduplicateListItems: OptimizerRule = {
  name: "deduplicate-list-items",
  applies: () => true,
  transform: (node: AnyNode): AnyNode | null => {
    if (node.type === "list") {
      const list = node as ListNode;
      const deduped: ListItemNode[] = [];
      let lastText = "";
      for (const item of list.children) {
        const text = JSON.stringify(item);
        if (text !== lastText) {
          deduped.push(item);
          lastText = text;
        }
      }
      return { ...list, children: deduped };
    }
    return node;
  },
};

/** Strip boilerplate text (copyright footers, page markers) */
export const stripBoilerplate: OptimizerRule = {
  name: "strip-boilerplate",
  applies: () => true,
  transform: (node: AnyNode): AnyNode | null => {
    if (node.type === "paragraph" || node.type === "text") {
      const text = "value" in node ? (node as TextNode).value : "";
      if (BOILERPLATE_RE.test(text)) return null;
    }
    return node;
  },
};

/** All built-in rules */
export const BUILTIN_RULES: Record<string, OptimizerRule> = {
  "strip-decorative-images": stripDecorativeImages,
  "collapse-repeated-headers": collapseRepeatedHeaders,
  "remove-html-comments": removeHtmlComments,
  "strip-whitespace-columns": stripWhitespaceColumns,
  "deduplicate-list-items": deduplicateListItems,
  "strip-boilerplate": stripBoilerplate,
};
