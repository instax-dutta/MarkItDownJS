import type { ConversionInput, ConversionResult, ConverterRegistry } from "@markitdownjs/shared";
import { DefaultConverterRegistry } from "./registry.js";
import { DocumentPipeline } from "./pipeline.js";
import { MarkdownRenderer } from "./renderer.js";

export interface MarkItDownOptions {
  registry?: ConverterRegistry;
}

export class MarkItDown {
  private pipeline: DocumentPipeline;
  private renderer: MarkdownRenderer;

  constructor(options?: MarkItDownOptions) {
    const registry = options?.registry ?? new DefaultConverterRegistry();
    this.pipeline = new DocumentPipeline(registry);
    this.renderer = new MarkdownRenderer();
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
