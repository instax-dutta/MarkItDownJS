import type { ConversionInput, ConversionResult, ConversionWarning, ConverterRegistry } from "@markitdownjs/shared";
import { ConversionError, CancellationError } from "@markitdownjs/shared";
import { checkSignal, readInputData } from "@markitdownjs/shared";
import { DefaultConverterRegistry } from "./registry.js";

export class DocumentPipeline {
  private registry: ConverterRegistry;

  constructor(registry?: ConverterRegistry) {
    this.registry = registry ?? new DefaultConverterRegistry();
  }

  getRegistry(): ConverterRegistry {
    return this.registry;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const signal = input.options?.signal;
    checkSignal(signal);

    const startTime = performance.now();
    const data = await readInputData(input.data);

    checkSignal(signal);

    const enrichedInput: ConversionInput = {
      ...input,
      data,
    };

    const converter = await this.registry.canConvert(enrichedInput);
    if (!converter) {
      throw new ConversionError(
        `No converter found for input${input.fileName ? ` "${input.fileName}"` : ""}`
      );
    }

    checkSignal(signal);

    const middlewares = this.registry.getMiddlewares();
    let processedInput = enrichedInput;

    for (const middleware of middlewares) {
      if (middleware.beforeConvert) {
        processedInput = await middleware.beforeConvert(processedInput);
      }
    }

    checkSignal(signal);

    let result: ConversionResult;
    try {
      result = await converter.convert(processedInput);
    } catch (error) {
      if (error instanceof CancellationError) throw error;
      // Check if the converter set any partial result/warnings before throwing
      const partialResult = (error as any).partialResult as ConversionResult | undefined;
      const partialWarnings = (error as any).warnings as ConversionWarning[] | undefined;
      if (partialResult) {
        result = partialResult;
        if (partialWarnings) {
          result.warnings = [...(result.warnings ?? []), ...partialWarnings];
        }
      } else {
        throw new ConversionError(
          `Converter "${converter.id}" failed: ${error instanceof Error ? error.message : String(error)}`,
          converter.id,
          error instanceof Error ? error : undefined
        );
      }
    }

    for (const middleware of middlewares) {
      if (middleware.afterConvert) {
        result = await middleware.afterConvert(result);
      }
    }

    const endTime = performance.now();
    result.stats = {
      ...result.stats,
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize: data.byteLength,
      outputSize: result.markdown.length,
    };

    return result;
  }

  async convertWithFallback(input: ConversionInput): Promise<ConversionResult> {
    try {
      return await this.convert(input);
    } catch (error) {
      if (input.mimeType) {
        const fallbackInput = { ...input, mimeType: undefined };
        return await this.convert(fallbackInput);
      }
      throw error;
    }
  }
}
