import { describe, it, expect } from "vitest";
import { AudioConverter } from "../audio-converter.js";

describe("AudioConverter", () => {
  const converter = new AudioConverter();

  it("should detect audio by MIME type", async () => {
    expect(await converter.canConvert({ data: "", mimeType: "audio/mpeg" })).toBe(true);
    expect(await converter.canConvert({ data: "", mimeType: "audio/wav" })).toBe(true);
    expect(await converter.canConvert({ data: "", mimeType: "audio/mp4" })).toBe(true);
    expect(await converter.canConvert({ data: "", mimeType: "audio/ogg" })).toBe(true);
    expect(await converter.canConvert({ data: "", mimeType: "audio/flac" })).toBe(true);
  });

  it("should detect audio by extension", async () => {
    expect(await converter.canConvert({ data: "", fileName: "test.mp3" })).toBe(true);
    expect(await converter.canConvert({ data: "", fileName: "test.wav" })).toBe(true);
    expect(await converter.canConvert({ data: "", fileName: "test.m4a" })).toBe(true);
    expect(await converter.canConvert({ data: "", fileName: "test.ogg" })).toBe(true);
    expect(await converter.canConvert({ data: "", fileName: "test.flac" })).toBe(true);
  });

  it("should reject non-audio files", async () => {
    expect(await converter.canConvert({ data: "", fileName: "test.txt" })).toBe(false);
    expect(await converter.canConvert({ data: "", mimeType: "text/plain" })).toBe(false);
  });

  it("should return placeholder when no provider is set", async () => {
    const result = await converter.convert({
      data: new Uint8Array([0, 1, 2, 3]),
      mimeType: "audio/mpeg",
    });
    expect(result.markdown).toContain("Transcription unavailable");
    expect(result.ast).toBeDefined();
    expect(result.ast!.type).toBe("document");
  });

  it("should use provider when set", async () => {
    converter.setProvider({
      async transcribe() {
        return "Hello from transcription";
      },
    });
    const result = await converter.convert({
      data: new Uint8Array([0, 1, 2, 3]),
      mimeType: "audio/mpeg",
    });
    expect(result.markdown).toBe("Hello from transcription");
  });

  it("should pass mimeType to provider", async () => {
    let receivedMimeType = "";
    converter.setProvider({
      async transcribe(_data, mimeType) {
        receivedMimeType = mimeType;
        return "done";
      },
    });
    await converter.convert({
      data: "audio data",
      mimeType: "audio/wav",
    });
    expect(receivedMimeType).toBe("audio/wav");
  });
});
