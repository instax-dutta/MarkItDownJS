

interface CreateConvertRouteOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  onConvert?: (result: unknown) => void;
}

export function createConvertRoute(options: CreateConvertRouteOptions = {}) {
  return async function POST(request: Request) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }

      if (options.maxFileSize && file.size > options.maxFileSize) {
        return Response.json({ error: 'File too large' }, { status: 413 });
      }

      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !options.allowedTypes.includes(ext)) {
          return Response.json({ error: 'File type not allowed' }, { status: 415 });
        }
      }

      const { MarkItDown } = await import('@markitdownjs/core');
      const parser = new MarkItDown();
      const result = await parser.convert(file);
      options.onConvert?.(result);
      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Conversion failed' },
        { status: 500 }
      );
    }
  };
}
