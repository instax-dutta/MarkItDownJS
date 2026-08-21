import { createConvertRoute } from '@markitdownjs/next';
import { createMarkItDown } from '@markitdownjs/markitdownjs';

const parser = createMarkItDown();

export const POST = createConvertRoute({
  parser,
  maxFileSize: 10 * 1024 * 1024, // 10MB
});
