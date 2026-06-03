import { createConvertRoute } from '@markitdownjs/next';

export const POST = createConvertRoute({
  maxFileSize: 10 * 1024 * 1024, // 10MB
});
