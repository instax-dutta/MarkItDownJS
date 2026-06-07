import type { ConversionInput, ConversionResult, ConverterRegistry } from "@markitdownjs/shared";
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

  async convert(
    input: ConversionInput | File | Blob | Uint8Array | string
  ): Promise<ConversionResult> {
    const normalizedInput = this.normalizeInput(input);
    return this.pipeline.convert(normalizedInput);
  }

  async convertToMarkdown(
    input: ConversionInput | File | Blob | Uint8Array | string
  ): Promise<string> {
    const result = await this.convert(input);
    return result.markdown;
  }

  async convertToJson(input: ConversionInput | File | Blob | Uint8Array | string): Promise<string> {
    const result = await this.convert(input);
    return this.renderer.render(result, "json");
  }

  private normalizeInput(
    input: ConversionInput | File | Blob | Uint8Array | string
  ): ConversionInput {
    if (typeof input === "string") {
      return { data: input };
    }
    if (input instanceof Uint8Array) {
      return { data: input };
    }
    if (typeof File !== "undefined" && input instanceof File) {
      return {
        data: input,
        fileName: input.name,
        mimeType: input.type || undefined,
      };
    }
    if (typeof Blob !== "undefined" && input instanceof Blob) {
      return { data: input };
    }
    return input as ConversionInput;
  }
}
