import type { ConversionResult } from '@markitdownjs/shared';
import { getSupportedExtensions, getSupportedMimeTypes } from '@markitdownjs/shared';

export async function formatsRoute() {
  const extensions = getSupportedExtensions();
  const mimeTypes = getSupportedMimeTypes();
  return Response.json({ extensions, mimeTypes });
}

export async function convertRoute(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const { MarkItDown } = await import('@markitdownjs/core');
    const parser = new MarkItDown();
    const result = await parser.convert(file);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Conversion failed' },
      { status: 500 }
    );
  }
}

export async function batchRoute(request: Request) {
  try {
    const formData = await request.formData();
    const entries = Array.from(formData.entries());
    const files = entries
      .filter((entry): entry is [string, File] => entry[1] instanceof File);

    if (files.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    const { MarkItDown } = await import('@markitdownjs/core');
    const parser = new MarkItDown();

    const results = await Promise.allSettled(
      files.map(async ([name, file]) => {
        const result = await parser.convert(file);
        return { name, result };
      })
    );

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<{ name: string; result: ConversionResult }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({ name: files[i]![0]!, error: r.reason?.message ?? 'Conversion failed' }));

    return Response.json({ succeeded, failed });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Batch conversion failed' },
      { status: 500 }
    );
  }
}
