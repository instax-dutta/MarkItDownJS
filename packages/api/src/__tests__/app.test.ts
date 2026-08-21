import { describe, it, expect } from "vitest";
import { createApp } from "../app.js";
import type { MarkItDown } from "@markitdownjs/core";
import type { ConversionResult } from "@markitdownjs/shared";

function createMockParser(): Pick<MarkItDown, "convert"> {
  const result: ConversionResult = {
    markdown: "# Mock",
    metadata: {},
    assets: [],
    tables: [],
    images: [],
    headings: [],
    format: "markdown",
    converterId: "mock",
    stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
  };
  return {
    async convert(): Promise<ConversionResult> {
      return result;
    },
  };
}

function multipartFile(): FormData {
  const formData = new FormData();
  formData.append("file", new File(["hello"], "test.txt", { type: "text/plain" }));
  return formData;
}

describe("createApp", () => {
  it("sends /convert to the injected parser", async () => {
    const parser = createMockParser() as unknown as MarkItDown;
    const app = createApp({ parser });

    const res = await app.request("/convert", { method: "POST", body: multipartFile() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as ConversionResult;
    expect(json.markdown).toBe("# Mock");
    expect(json.converterId).toBe("mock");
  });

  it("returns a clear configuration error when no parser is configured", async () => {
    const app = createApp();

    const res = await app.request("/convert", { method: "POST", body: multipartFile() });
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/parser/i);
  });
});
