import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createMarkItDown } from "markitdownjs";

const app = new Hono();
const md = createMarkItDown();

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.3.0" }));

// Convert a file upload to Markdown
app.post("/convert", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded. Send a file with form field 'file'." }, 400);
    }

    const result = await md.convert(file);

    return c.json({
      markdown: result.markdown,
      metadata: result.metadata,
      chunks: result.chunks?.length ?? 0,
      stats: {
        duration: result.stats.duration,
        inputSize: result.stats.inputSize,
        outputSize: result.stats.outputSize,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// Convert Markdown to other formats
app.post("/convert/:format", async (c) => {
  const format = c.req.param("format");

  if (!["json", "html", "plaintext"].includes(format)) {
    return c.json({ error: `Unsupported format: ${format}` }, 400);
  }

  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded." }, 400);
    }

    const result = await md.convert(file);

    return c.json({
      markdown: result.markdown,
      format,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// List supported formats
app.get("/formats", (c) => {
  const registry = md.getRegistry();
  const converters = registry.list();

  const formats = converters.map((conv) => ({
    id: conv.id,
    mimeTypes: conv.supportedMimeTypes,
    extensions: conv.supportedExtensions,
  }));

  return c.json({ formats });
});

const port = parseInt(process.env.PORT ?? "3000", 10);

console.log(`MarkItDownJS API server running at http://localhost:${port}`);
console.log(`Supported formats: ${md.getRegistry().list().map((c) => c.id).join(", ")}`);

serve({ fetch: app.fetch, port });
