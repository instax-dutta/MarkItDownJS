import { Hono } from "hono";
import { cors } from "hono/cors";
import { getSupportedExtensions, getSupportedMimeTypes } from "@markitdownjs/shared";
import type { MarkItDown } from "@markitdownjs/core";

export interface CreateAppOptions {
  /** Configured MarkItDown parser used by the /convert route. */
  parser?: MarkItDown;
}

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = new Hono();
  const parser = options.parser;

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
      if (!parser) {
        return c.json(
          {
            error: "No parser configured. Pass a MarkItDown instance via createApp({ parser }).",
          },
          500
        );
      }

      const body = await c.req.parseBody();
      const file = body["file"];

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

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

  return app;
}

export default createApp();
