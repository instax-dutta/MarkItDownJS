import { describe, it, expect, vi } from "vitest";
import { MarkItDown } from "../parser.js";
import type {
  Converter,
  ConversionInput,
  ConversionResult,
  DocumentRenderer,
  Chunker,
  AnyNode,
  DocumentChunk,
  ChunkingOptions,
} from "@markitdownjs/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockConverter(id = "mock"): Converter {
  return {
    id,
    supportedMimeTypes: ["text/plain"],
    supportedExtensions: [".txt"],
    async canConvert(input: ConversionInput): Promise<boolean> {
      return input.mimeType === "text/plain";
    },
    async convert(_input: ConversionInput): Promise<ConversionResult> {
      return {
        markdown: "# Hello\n\nWorld",
        metadata: { title: "Test" },
        assets: [],
        tables: [],
        images: [],
        headings: [{ level: 1, text: "Hello" }],
        format: "markdown",
        converterId: id,
        stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
        ast: {
          type: "document",
          children: [
            { type: "heading", level: 1, children: [{ type: "text", value: "Hello" }] },
            { type: "paragraph", children: [{ type: "text", value: "World" }] },
          ],
        } as unknown as AnyNode,
      };
    },
  };
}

function createMockRenderer(): DocumentRenderer {
  return {
    render(result: ConversionResult, format?: string): string {
      return `custom:${format ?? "markdown"}:${result.markdown}`;
    },
  };
}

function createMockChunker(): Chunker {
  return {
    chunk(_ast: AnyNode, _options: ChunkingOptions): DocumentChunk[] {
      return [
        {
          id: "chunk-1",
          content: "Chunk content",
          metadata: {
            chunkId: "chunk-1",
            headingPath: [],
            tokenCount: 3,
            startIndex: 0,
            endIndex: 1,
          },
          ast: { type: "document", children: [] } as unknown as AnyNode,
        },
      ];
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MarkItDown", () => {
  // -----------------------------------------------------------------------
  // registerConverter
  // -----------------------------------------------------------------------

  describe("registerConverter", () => {
    it("should register a converter through the convenience method", () => {
      const md = new MarkItDown();
      const converter = createMockConverter("test");
      md.registerConverter(converter);
      expect(md.getRegistry().get("test")).toBe(converter);
    });

    it("should make converter available for conversion", async () => {
      const md = new MarkItDown();
      md.registerConverter(createMockConverter("test"));
      const result = await md.convert({ data: "hello", mimeType: "text/plain" });
      expect(result.markdown).toBe("# Hello\n\nWorld");
      expect(result.converterId).toBe("test");
    });
  });

  // -----------------------------------------------------------------------
  // registerRenderer
  // -----------------------------------------------------------------------

  describe("registerRenderer", () => {
    it("should use the custom renderer in convertToJson when registered", async () => {
      const md = new MarkItDown();
      md.registerConverter(createMockConverter("test"));
      md.registerRenderer(createMockRenderer());

      const json = await md.convertToJson({ data: "hello", mimeType: "text/plain" });
      expect(json).toContain("custom:json:");
    });

    it("should fall back to the default renderer when no custom renderer is set", async () => {
      const md = new MarkItDown();
      md.registerConverter(createMockConverter("test"));

      const json = await md.convertToJson({ data: "hello", mimeType: "text/plain" });
      // Default renderer outputs JSON-serialized AST
      expect(json).toContain('"type": "document"');
    });
  });

  // -----------------------------------------------------------------------
  // registerChunker
  // -----------------------------------------------------------------------

  describe("registerChunker", () => {
    it("should not chunk when chunker is registered but chunking options are absent", async () => {
      const md = new MarkItDown();
      md.registerConverter(createMockConverter("test"));
      md.registerChunker(createMockChunker());

      const result = await md.convert({ data: "hello", mimeType: "text/plain" });
      expect(result.chunks).toBeUndefined();
    });

    it("should not chunk when chunking options are provided but no chunker is registered", async () => {
      const md = new MarkItDown();
      md.registerConverter(createMockConverter("test"));

      const result = await md.convert({
        data: "hello",
        mimeType: "text/plain",
        options: { chunking: { enabled: true, strategy: "heading" } },
      });
      expect(result.chunks).toBeUndefined();
    });

    it("should auto-chunk when chunker is registered and chunking options are provided", async () => {
      const md = new MarkItDown();
      md.registerConverter(createMockConverter("test"));

      const chunker = createMockChunker();
      const chunkSpy = vi.spyOn(chunker, "chunk");
      md.registerChunker(chunker);

      const result = await md.convert({
        data: "hello",
        mimeType: "text/plain",
        options: { chunking: { enabled: true, strategy: "heading", maxTokens: 100 } },
      });

      expect(chunkSpy).toHaveBeenCalledOnce();
      expect(result.chunks).toBeDefined();
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks![0]!.content).toBe("Chunk content");
    });

    it("should skip chunking when the result has no AST", async () => {
      const converterWithoutAst: Converter = {
        ...createMockConverter("no-ast"),
        async convert(_input: ConversionInput): Promise<ConversionResult> {
          return {
            markdown: "No AST here",
            metadata: {},
            assets: [],
            tables: [],
            images: [],
            headings: [],
            format: "markdown",
            converterId: "no-ast",
            stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
            // no ast property
          };
        },
      };

      const md = new MarkItDown();
      md.registerConverter(converterWithoutAst);

      const chunker = createMockChunker();
      const chunkSpy = vi.spyOn(chunker, "chunk");
      md.registerChunker(chunker);

      const result = await md.convert({
        data: "hello",
        mimeType: "text/plain",
        options: { chunking: { enabled: true, strategy: "heading" } },
      });

      expect(chunkSpy).not.toHaveBeenCalled();
      expect(result.chunks).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // normalizeInput (private, tested via convert)
  // -----------------------------------------------------------------------

  describe("normalizeInput", () => {
    it("should extract fileName from a string path", async () => {
      const md = new MarkItDown();
      // Register a converter that can detect by extension
      const converter: Converter = {
        id: "by-ext",
        supportedMimeTypes: ["application/x-test"],
        supportedExtensions: [".txt"],
        async canConvert(input: ConversionInput): Promise<boolean> {
          return input.fileName?.endsWith(".txt") ?? false;
        },
        async convert(_input: ConversionInput): Promise<ConversionResult> {
          return {
            markdown: `Converted file: ${_input.fileName}`,
            metadata: {},
            assets: [],
            tables: [],
            images: [],
            headings: [],
            format: "markdown",
            converterId: "by-ext",
            stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
          };
        },
      };
      md.registerConverter(converter);

      const result = await md.convert("path/to/document.txt");
      expect(result.markdown).toBe("Converted file: document.txt");
    });

    it("should detect MIME type from Uint8Array buffer with PDF magic bytes", async () => {
      const md = new MarkItDown();
      // Register a converter that only accepts PDF
      const pdfConverter: Converter = {
        id: "pdf-detector",
        supportedMimeTypes: ["application/pdf"],
        supportedExtensions: [".pdf"],
        async canConvert(input: ConversionInput): Promise<boolean> {
          return input.mimeType === "application/pdf";
        },
        async convert(_input: ConversionInput): Promise<ConversionResult> {
          return {
            markdown: "PDF detected",
            metadata: {},
            assets: [],
            tables: [],
            images: [],
            headings: [],
            format: "markdown",
            converterId: "pdf-detector",
            stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
          };
        },
      };
      md.registerConverter(pdfConverter);

      // PDF magic bytes: %PDF
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x61, 0x62, 0x63]);
      const result = await md.convert(pdfBuffer);
      expect(result.markdown).toBe("PDF detected");
    });

    it("should not detect MIME from a buffer with unknown magic bytes", async () => {
      const md = new MarkItDown();
      const sniffSheet: [string, Uint8Array][] = [
        ["ODS (PK)", new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
        ["Random", new Uint8Array([0x00, 0x01, 0x02, 0x03])],
      ];

      for (const [, buf] of sniffSheet) {
        // The normalizeInput for Uint8Array paths will set the detected mimeType
        // If mimeType is detected, the registry's canConvert will use it
        // We just verify no error is thrown — the conversion will fail with
        // "No converter found" since we haven't registered anything for those types
        await expect(md.convert(buf)).rejects.toThrow("No converter found");
      }
    });
  });
});
