import { Hono } from "hono";
import { cors } from "hono/cors";
import { getSupportedExtensions, getSupportedMimeTypes } from "@markitdownjs/shared";

const app = new Hono();

app.use("/*", cors());

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.get("/formats", async (c) => {
  return c.json({
    extensions: getSupportedExtensions(),
    mimeTypes: getSupportedMimeTypes(),
  });
});

app.post("/convert", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    const { MarkItDown } = await import("@markitdownjs/core");
    const parser = new MarkItDown();

    const arrayBuffer = await file.arrayBuffer();
    const result = await parser.convert({
      data: new Uint8Array(arrayBuffer),
      fileName: file.name,
      mimeType: file.type || undefined,
    });

    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Conversion failed" }, 500);
  }
});

export default app;
