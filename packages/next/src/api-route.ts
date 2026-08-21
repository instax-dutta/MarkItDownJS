import type { MarkItDownParser } from "./types.js";

export interface CreateConvertRouteOptions {
  /** Configured parser used for conversion. */
  parser: MarkItDownParser;
  maxFileSize?: number;
  allowedTypes?: string[];
  onConvert?: (result: unknown) => void;
}

export function createConvertRoute(options: CreateConvertRouteOptions) {
  const { parser, maxFileSize, allowedTypes, onConvert } = options;

  return async function POST(request: Request) {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      if (maxFileSize && file.size > maxFileSize) {
        return Response.json({ error: "File too large" }, { status: 413 });
      }

      if (allowedTypes && allowedTypes.length > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !allowedTypes.includes(ext)) {
          return Response.json({ error: "File type not allowed" }, { status: 415 });
        }
      }

      const result = await parser.convert(file);
      onConvert?.(result);
      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Conversion failed" },
        { status: 500 }
      );
    }
  };
}
