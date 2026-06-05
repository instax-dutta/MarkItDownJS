import { Command } from "commander";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { MarkItDown } from "@markitdownjs/core";

export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Start an HTTP server for document conversion")
    .option("-p, --port <port>", "Port to listen on", "3000")
    .option("-v, --verbose", "Verbose output")
    .action((options: { port: string; verbose: boolean }) => {
      const port = parseInt(options.port, 10);
      const parser = new MarkItDown();

      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "GET" && req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
          return;
        }

        if (req.method === "POST" && req.url === "/convert") {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const body = Buffer.concat(chunks).toString();

            let fileData: string | undefined;
            let fileName: string | undefined;

            const contentType = req.headers["content-type"] ?? "";
            if (contentType.includes("multipart/form-data")) {
              const boundaryMatch = contentType.match(/boundary=(.+)/);
              if (!boundaryMatch) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Missing boundary in multipart content-type" }));
                return;
              }

              const boundary = boundaryMatch[1]!;
              const parts = body.split(`--${boundary}`);
              for (const part of parts) {
                if (part.includes("Content-Disposition")) {
                  const nameMatch = part.match(/name="([^"]+)"/);
                  const filenameMatch = part.match(/filename="([^"]+)"/);
                  if (nameMatch?.[1] === "file") {
                    const headerEnd = part.indexOf("\r\n\r\n");
                    if (headerEnd !== -1) {
                      fileData = part.substring(headerEnd + 4).replace(/\r\n--$/, "");
                      if (filenameMatch?.[1]) {
                        fileName = filenameMatch[1];
                      }
                    }
                  }
                }
              }
            } else {
              const json = JSON.parse(body);
              fileData = json.data;
              fileName = json.fileName;
            }

            if (!fileData) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "No file provided" }));
              return;
            }

            const result = await parser.convert({
              data: Buffer.from(fileData, "base64"),
              fileName,
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } catch (error) {
            if (options.verbose) {
              console.error("Conversion error:", error);
            }
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Conversion failed",
              })
            );
          }
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      });

      server.listen(port, () => {
        console.error(`MarkItDownJS server running on http://localhost:${port}`);
      });
    });
}
