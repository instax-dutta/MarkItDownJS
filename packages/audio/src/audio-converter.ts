import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
} from "@markitdownjs/shared";
import { createNode, readInputData } from "@markitdownjs/shared";

export interface AudioTranscriptionProvider {
  transcribe(audioData: Uint8Array, mimeType: string): Promise<string>;
}

export class AudioConverter implements Converter {
  readonly id = "audio";
  readonly supportedMimeTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/flac"];
  readonly supportedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac"];

  private provider: AudioTranscriptionProvider | null = null;

  setProvider(provider: AudioTranscriptionProvider): void {
    this.provider = provider;
  }

  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType && this.supportedMimeTypes.includes(input.mimeType)) {
      return true;
    }

    if (input.fileName) {
      const ext = input.fileName.slice(input.fileName.lastIndexOf(".")).toLowerCase();
      if (this.supportedExtensions.includes(ext)) {
        return true;
      }
    }

    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const data = await readInputData(input.data);
    const mimeType = input.mimeType ?? "audio/mpeg";

    let transcription: string;
    if (this.provider) {
      transcription = await this.provider.transcribe(data, mimeType);
    } else {
      transcription =
        "[Transcription unavailable: no AudioTranscriptionProvider configured. Call setProvider() to inject a transcription service.]";
    }

    const textNode = createNode({
      type: "text" as const,
      value: transcription,
    });

    const paragraphNode = createNode({
      type: "paragraph" as const,
      children: [textNode],
    });

    const documentNode = createNode({
      type: "document" as const,
      children: [paragraphNode],
    });

    const endTime = performance.now();
    const stats: ConversionStats = {
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize: data.length,
      outputSize: transcription.length,
    };

    return {
      markdown: transcription,
      metadata: {
        wordCount: transcription.split(/\s+/).filter(Boolean).length,
      },
      assets: [],
      tables: [],
      images: [],
      headings: [],
      ast: documentNode,
      format: "markdown",
      converterId: this.id,
      stats,
    };
  }
}
