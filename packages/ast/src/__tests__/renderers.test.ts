import { describe, it, expect } from "vitest";
import { MarkdownRenderer } from "../markdown-renderer.js";
import { HtmlRenderer } from "../html-renderer.js";
import { PlainTextRenderer } from "../plaintext-renderer.js";
import { JsonRenderer } from "../json-renderer.js";
import { createNode } from "@markitdownjs/shared";
import type {
  DocumentNode,
  HeadingNode,
  ImageNode,
  LinkNode,
  ParagraphNode,
  TextNode,
} from "@markitdownjs/shared";

const testAst = createNode<DocumentNode>({
  type: "document",
  children: [
    createNode<HeadingNode>({
      type: "heading",
      level: 1,
      children: [createNode<TextNode>({ type: "text", value: "Hello World" })],
    }),
    createNode<ParagraphNode>({
      type: "paragraph",
      children: [createNode<TextNode>({ type: "text", value: "This is a test document." })],
    }),
  ],
});

describe("MarkdownRenderer", () => {
  it("should render AST to markdown", () => {
    const renderer = new MarkdownRenderer();
    const md = renderer.render(testAst);
    expect(md).toContain("# Hello World");
    expect(md).toContain("This is a test document.");
  });
});

describe("HtmlRenderer", () => {
  it("should render AST to HTML", () => {
    const renderer = new HtmlRenderer();
    const html = renderer.render(testAst);
    expect(html).toContain("<h1>Hello World</h1>");
    expect(html).toContain("<p>This is a test document.</p>");
  });
});

describe("PlainTextRenderer", () => {
  it("should render AST to plain text", () => {
    const renderer = new PlainTextRenderer();
    const text = renderer.render(testAst);
    expect(text).toContain("Hello World");
    expect(text).toContain("This is a test document.");
    expect(text).not.toContain("#");
  });
});

describe("JsonRenderer", () => {
  it("should render AST to JSON", () => {
    const renderer = new JsonRenderer();
    const json = renderer.render(testAst);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("document");
  });
});

describe("HtmlRenderer safety", () => {
  it("escapes heading id attributes", () => {
    const renderer = new HtmlRenderer();
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<HeadingNode>({
          type: "heading",
          level: 2,
          id: 'a"b<c',
          children: [createNode<TextNode>({ type: "text", value: "Title" })],
        }),
      ],
    });

    const html = renderer.render(doc);
    expect(html).toContain('id="a&quot;b&lt;c"');
    expect(html).not.toContain('id="a"b<c"');
  });

  it("renders javascript: link URLs inert", () => {
    const renderer = new HtmlRenderer();
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [
            createNode<LinkNode>({
              type: "link",
              href: "javascript:alert(1)",
              children: [createNode<TextNode>({ type: "text", value: "click" })],
            }),
          ],
        }),
      ],
    });

    const html = renderer.render(doc);
    expect(html).not.toContain("javascript:");
    expect(html).toContain("click");
  });

  it("renders javascript: image URLs inert", () => {
    const renderer = new HtmlRenderer();
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [
            createNode<ImageNode>({
              type: "image",
              src: "javascript:alert(1)",
              alt: "x",
            }),
          ],
        }),
      ],
    });

    const html = renderer.render(doc);
    expect(html).not.toContain("javascript:");
  });

  it("still renders safe http(s) links", () => {
    const renderer = new HtmlRenderer();
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [
            createNode<LinkNode>({
              type: "link",
              href: "https://example.com",
              children: [createNode<TextNode>({ type: "text", value: "site" })],
            }),
          ],
        }),
      ],
    });

    const html = renderer.render(doc);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("site");
  });
});
