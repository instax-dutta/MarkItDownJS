import { describe, it, expect } from "vitest";
import { DocumentChunker } from "../chunker.js";
import { createNode } from "@markitdownjs/shared";
import type {
  BlockquoteNode,
  DocumentNode,
  HeadingNode,
  PageBreakNode,
  ParagraphNode,
  TextNode,
} from "@markitdownjs/shared";

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("DocumentChunker", () => {
  const chunker = new DocumentChunker();

  const ast = createNode<DocumentNode>({
    type: "document",
    children: [
      createNode<HeadingNode>({
        type: "heading",
        level: 1,
        children: [createNode<TextNode>({ type: "text", value: "Introduction" })],
      }),
      createNode<ParagraphNode>({
        type: "paragraph",
        children: [
          createNode<TextNode>({ type: "text", value: "This is the introduction paragraph." }),
        ],
      }),
      createNode<HeadingNode>({
        type: "heading",
        level: 1,
        children: [createNode<TextNode>({ type: "text", value: "Main Content" })],
      }),
      createNode<ParagraphNode>({
        type: "paragraph",
        children: [createNode<TextNode>({ type: "text", value: "This is the main content." })],
      }),
    ],
  });

  it("should chunk by heading", () => {
    const chunks = chunker.chunk(ast, { strategy: "heading" });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]!.metadata.headingPath).toContain("Introduction");
  });

  it("should chunk by fixed size", () => {
    const chunks = chunker.chunk(ast, { strategy: "fixed", maxTokens: 5, overlap: 2 });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("should generate chunk IDs", () => {
    const chunks = chunker.chunk(ast, { strategy: "heading" });
    for (const chunk of chunks) {
      expect(chunk.id).toBeDefined();
      expect(chunk.id.length).toBeGreaterThan(0);
    }
  });

  it("should emit each source phrase exactly once when chunking by heading", () => {
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<HeadingNode>({
          type: "heading",
          level: 1,
          children: [createNode<TextNode>({ type: "text", value: "Intro" })],
        }),
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [createNode<TextNode>({ type: "text", value: "alpha beta gamma" })],
        }),
      ],
    });

    const chunks = chunker.chunk(doc, { strategy: "heading" });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.metadata.headingPath).toContain("Intro");
    expect(countOccurrences(chunks[0]!.content, "alpha beta gamma")).toBe(1);
  });

  it("should create page-bounded chunks without text duplication", () => {
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [createNode<TextNode>({ type: "text", value: "page one content" })],
        }),
        createNode<PageBreakNode>({ type: "page-break", pageNumber: 1 }),
        createNode<ParagraphNode>({
          type: "paragraph",
          children: [createNode<TextNode>({ type: "text", value: "page two content" })],
        }),
      ],
    });

    const chunks = chunker.chunk(doc, { strategy: "page" });
    expect(chunks).toHaveLength(2);
    expect(countOccurrences(chunks[0]!.content, "page one content")).toBe(1);
    expect(countOccurrences(chunks[1]!.content, "page two content")).toBe(1);
    expect(chunks[0]!.content).not.toContain("page two content");
    expect(chunks[1]!.content).not.toContain("page one content");
  });

  it("should emit nested paragraphs exactly once when chunking semantically", () => {
    const doc = createNode<DocumentNode>({
      type: "document",
      children: [
        createNode<BlockquoteNode>({
          type: "blockquote",
          children: [
            createNode<ParagraphNode>({
              type: "paragraph",
              children: [createNode<TextNode>({ type: "text", value: "quoted alpha" })],
            }),
          ],
        }),
      ],
    });

    const chunks = chunker.chunk(doc, { strategy: "semantic" });
    const combined = chunks.map((c) => c.content).join("\n");
    expect(countOccurrences(combined, "quoted alpha")).toBe(1);
  });

  it("should terminate and advance when overlap is not smaller than maxTokens", () => {
    const chunks = chunker.chunk(ast, { strategy: "fixed", maxTokens: 5, overlap: 10 });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    const starts = chunks.map((c) => c.metadata.startIndex);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]!).toBeGreaterThan(starts[i - 1]!);
    }
  });
});
