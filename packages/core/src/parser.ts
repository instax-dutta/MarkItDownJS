import type {
  ConversionInput,
  ConversionResult,
  ConverterRegistry,
  DocumentRenderer,
  Chunker,
  Converter,
} from "@markitdownjs/shared";
import { detectMimeTypeFromData } from "@markitdownjs/shared";
import { DefaultConverterRegistry } from "./registry.js";
import { DocumentPipeline } from "./pipeline.js";
import { MarkdownRenderer } from "./renderer.js";

export interface MarkItDownOptions {
  registry?: ConverterRegistry;
  /** Auto-register all installed @markitdownjs/* converter packages. */
  preset?: "all";
}

export class MarkItDown {
  private pipeline: DocumentPipeline;
  private renderer: MarkdownRenderer;
  private customRenderer?: DocumentRenderer;
  private chunker?: Chunker;

  constructor(options?: MarkItDownOptions) {
    const registry = options?.registry ?? new DefaultConverterRegistry();
    this.pipeline = new DocumentPipeline(registry);
    this.renderer = new MarkdownRenderer();
  }

  /**
   * Async factory that optionally auto-registers all installed converter packages.
   *
   * @example
   * const parser = await MarkItDown.create({ preset: "all" });
   */
  static async create(options?: MarkItDownOptions): Promise<MarkItDown> {
    const instance = new MarkItDown(options);
    if (options?.preset === "all") {
      await instance._loadConverterPresets();
    }
    return instance;
  }

  private async _loadConverterPresets(): Promise<void> {
    const pkgs: [string, string][] = [
      ["@markitdownjs/pdf", "PdfConverter"],
      ["@markitdownjs/docx", "DocxConverter"],
      ["@markitdownjs/xlsx", "XlsxConverter"],
      ["@markitdownjs/pptx", "PptxConverter"],
      ["@markitdownjs/epub", "EpubConverter"],
      ["@markitdownjs/html", "HtmlConverter"],
      ["@markitdownjs/csv", "CsvConverter"],
      ["@markitdownjs/json", "JsonConverter"],
      ["@markitdownjs/xml", "XmlConverter"],
      ["@markitdownjs/archive", "ArchiveConverter"],
      ["@markitdownjs/image-ocr", "OcrConverter"],
      ["@markitdownjs/audio", "AudioConverter"],
    ];
    for (const [pkg, cls] of pkgs) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (await import(pkg)) as Record<string, new () => any>;
        if (mod[cls]) this.getRegistry().register(new mod[cls]!());
      } catch {
        // Package not installed — skip silently.
      }
    }
  }

  getRegistry(): ConverterRegistry {
    return this.pipeline.getRegistry();
  }

  /**
   * Register a converter by delegating to the internal registry.
   */
  registerConverter(converter: Converter): void {
    this.getRegistry().register(converter);
  }

  /**
   * Register a custom document renderer that overrides the default MarkdownRenderer.
   * Accepts any object implementing the DocumentRenderer interface.
   */
  registerRenderer(renderer: DocumentRenderer): void {
    this.customRenderer = renderer;
  }

  /**
   * Register a chunker for RAG document chunking.
   * When a chunker is registered and `chunking` options are provided to `convert()`,
   * chunks are automatically generated after conversion.
   */
  registerChunker(chunker: Chunker): void {
    this.chunker = chunker;
  }

  async convert(
    input: ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string
  ): Promise<ConversionResult> {
    const normalizedInput = this.normalizeInput(input);
    const result = await this.pipeline.convert(normalizedInput);

    // Auto-chunk if a chunker is registered and chunking options are provided.
    const chunking = normalizedInput.options?.chunking;
    if (this.chunker && result.ast && chunking && chunking.enabled !== false) {
      result.chunks = this.chunker.chunk(result.ast, chunking);
    }

    return result;
  }

  async convertToMarkdown(
    input: ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string
  ): Promise<string> {
    const result = await this.convert(input);
    return result.markdown;
  }

  async convertToJson(
    input: ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string
  ): Promise<string> {
    const result = await this.convert(input);
    const renderer = this.customRenderer ?? this.renderer;
    return renderer.render(result, "json");
  }

  private normalizeInput(
    input: ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string
  ): ConversionInput {
    if (typeof input === "string") {
      // Extract fileName from the path for extension-based MIME detection
      const fileName = input.split(/[/\\]/).pop();
      return { data: input, fileName };
    }
    if (input instanceof Uint8Array) {
      // Auto-detect MIME from buffer magic bytes when no mimeType is provided
      const mimeType = detectMimeTypeFromData(input);
      return { data: input, mimeType };
    }
    if (input instanceof ArrayBuffer) {
      const bytes = new Uint8Array(input);
      const mimeType = detectMimeTypeFromData(bytes);
      return { data: bytes, mimeType };
    }
    if (typeof File !== "undefined" && input instanceof File) {
      return {
        data: input,
        fileName: input.name,
        mimeType: input.type || undefined,
      };
    }
    if (typeof Blob !== "undefined" && input instanceof Blob) {
      return { data: input, mimeType: input.type || undefined };
    }
    return input as ConversionInput;
  }
}
