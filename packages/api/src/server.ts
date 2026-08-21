import { serve } from "@hono/node-server";
import type { MarkItDown } from "@markitdownjs/core";
import { createApp } from "./app.js";

export interface StartServerOptions {
  /** Configured MarkItDown parser used for conversion. */
  parser?: MarkItDown;
  /** Port to listen on. Defaults to `PORT` env var or 3000. */
  port?: number;
}

export function startServer(options: StartServerOptions = {}): void {
  const port = options.port ?? parseInt(process.env.PORT ?? "3000", 10);
  const app = createApp({ parser: options.parser });

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`MarkItDownJS API server running on http://localhost:${info.port}`);
  });
}

// Start immediately when run as a standalone entry (e.g. `node dist/server.js`).
startServer();
