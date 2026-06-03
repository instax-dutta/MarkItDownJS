'use server';

import type { ConversionResult } from '@markitdownjs/shared';

export async function convertDocumentAction(formData: FormData): Promise<ConversionResult> {
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new Error('No file provided');
  }

  const { MarkItDown } = await import('@markitdownjs/core');
  const parser = new MarkItDown();
  return parser.convert(file);
}
