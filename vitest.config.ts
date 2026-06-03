import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@markitdownjs/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@markitdownjs/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@markitdownjs/ast': path.resolve(__dirname, 'packages/ast/src/index.ts'),
      '@markitdownjs/chunking': path.resolve(__dirname, 'packages/chunking/src/index.ts'),
      '@markitdownjs/csv': path.resolve(__dirname, 'packages/csv/src/index.ts'),
      '@markitdownjs/json': path.resolve(__dirname, 'packages/json/src/index.ts'),
      '@markitdownjs/html': path.resolve(__dirname, 'packages/html/src/index.ts'),
      '@markitdownjs/xml': path.resolve(__dirname, 'packages/xml/src/index.ts'),
      '@markitdownjs/audio': path.resolve(__dirname, 'packages/audio/src/index.ts'),
      '@markitdownjs/archive': path.resolve(__dirname, 'packages/archive/src/index.ts'),
      '@markitdownjs/pdf': path.resolve(__dirname, 'packages/pdf/src/index.ts'),
      '@markitdownjs/docx': path.resolve(__dirname, 'packages/docx/src/index.ts'),
      '@markitdownjs/pptx': path.resolve(__dirname, 'packages/pptx/src/index.ts'),
      '@markitdownjs/xlsx': path.resolve(__dirname, 'packages/xlsx/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/index.ts'],
    },
  },
});
