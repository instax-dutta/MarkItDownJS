import { describe, it, expect } from "vitest";
import {
  detectMimeTypeFromData,
  detectMimeTypeFromBuffer,
  checkSignal,
  AbortError,
} from "../utils.js";

describe("detectMimeTypeFromData", () => {
  it("detects PDF magic bytes", () => {
    expect(detectMimeTypeFromData(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]))).toBe(
      "application/pdf"
    );
  });

  it("detects PNG magic bytes", () => {
    expect(detectMimeTypeFromData(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe(
      "image/png"
    );
  });

  it("detects ZIP magic bytes", () => {
    expect(detectMimeTypeFromData(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(
      "application/zip"
    );
  });

  it("returns undefined for unknown bytes", () => {
    expect(detectMimeTypeFromData(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]))).toBeUndefined();
  });
});

describe("detectMimeTypeFromBuffer", () => {
  it("falls back to extension detection when magic bytes are unknown", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeTypeFromBuffer(bytes, "report.pdf")).toBe("application/pdf");
  });

  it("prefers magic bytes over the filename extension", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(detectMimeTypeFromBuffer(bytes, "photo.pdf")).toBe("image/png");
  });
});

describe("checkSignal", () => {
  it("throws AbortError when the signal is aborted", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => checkSignal(controller.signal)).toThrow(AbortError);
  });

  it("does not throw when the signal is not aborted", () => {
    expect(() => checkSignal(new AbortController().signal)).not.toThrow();
  });
});
