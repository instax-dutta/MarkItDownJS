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
