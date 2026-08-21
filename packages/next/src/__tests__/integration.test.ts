import { describe, it, expect } from "vitest";
import { createConvertRoute, convertRoute, batchRoute } from "../index.js";
import type { ConversionResult } from "@markitdownjs/shared";

function mockParser() {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async convert(_input: any): Promise<ConversionResult> {
      return result;
    },
  };
}

function fileRequest(): Request {
  const formData = new FormData();
  formData.append("file", new File(["hello"], "test.txt", { type: "text/plain" }));
  return new Request("http://localhost/convert", { method: "POST", body: formData });
}

describe("Next parser injection", () => {
  it("createConvertRoute uses the injected parser", async () => {
    const POST = createConvertRoute({ parser: mockParser() });
    const res = await POST(fileRequest());
    const json = (await res.json()) as ConversionResult;
    expect(json.markdown).toBe("# Mock");
  });

  it("convertRoute uses the injected parser", async () => {
    const res = await convertRoute(fileRequest(), mockParser());
    const json = (await res.json()) as ConversionResult;
    expect(json.markdown).toBe("# Mock");
  });

  it("convertRoute returns a clear error when no parser is supplied", async () => {
    const res = await convertRoute(fileRequest());
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/parser/i);
  });

  it("batchRoute uses the injected parser", async () => {
    const res = await batchRoute(fileRequest(), mockParser());
    const json = (await res.json()) as {
      succeeded: { name: string; result: ConversionResult }[];
      failed: { name: string; error: string }[];
    };
    expect(json.succeeded).toHaveLength(1);
    expect(json.succeeded[0]!.result.markdown).toBe("# Mock");
  });
});
