import { describe, it, expect } from 'vitest';
import { DocumentPipeline } from '../pipeline.js';
import { DefaultConverterRegistry } from '../registry.js';
import type { Converter, ConversionInput, ConversionResult } from '@markitdownjs/shared';

function createMockConverter(id: string): Converter {
  return {
    id,
    supportedMimeTypes: ['text/plain'],
    supportedExtensions: ['.txt'],
    async canConvert(input: ConversionInput): Promise<boolean> {
      return input.mimeType === 'text/plain';
    },
    async convert(_input: ConversionInput): Promise<ConversionResult> {
      return {
        markdown: '# Hello\n\nWorld',
        metadata: { title: 'Test' },
        assets: [],
        tables: [],
        images: [],
        headings: [{ level: 1, text: 'Hello' }],
        format: 'markdown',
        converterId: id,
        stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
      };
    },
  };
}

describe('DocumentPipeline', () => {
  it('should convert input using registered converter', async () => {
    const registry = new DefaultConverterRegistry();
    registry.register(createMockConverter('test'));
    const pipeline = new DocumentPipeline(registry);
    const result = await pipeline.convert({
      data: 'test content',
      mimeType: 'text/plain',
    });
    expect(result.markdown).toBe('# Hello\n\nWorld');
    expect(result.converterId).toBe('test');
  });

  it('should throw when no converter found', async () => {
    const registry = new DefaultConverterRegistry();
    const pipeline = new DocumentPipeline(registry);
    await expect(
      pipeline.convert({ data: 'test', mimeType: 'application/unknown' })
    ).rejects.toThrow('No converter found');
  });

  it('should apply middleware', async () => {
    const registry = new DefaultConverterRegistry();
    registry.register(createMockConverter('test'));
    registry.addMiddleware({
      name: 'test-middleware',
      priority: 0,
      afterConvert: async (result) => ({
        ...result,
        markdown: result.markdown + '\n\n[modified]',
      }),
    });
    const pipeline = new DocumentPipeline(registry);
    const result = await pipeline.convert({
      data: 'test',
      mimeType: 'text/plain',
    });
    expect(result.markdown).toContain('[modified]');
  });

  it('should support abort signal', async () => {
    const registry = new DefaultConverterRegistry();
    registry.register(createMockConverter('test'));
    const pipeline = new DocumentPipeline(registry);
    const controller = new AbortController();
    controller.abort();
    await expect(
      pipeline.convert({
        data: 'test',
        mimeType: 'text/plain',
        options: { signal: controller.signal },
      })
    ).rejects.toThrow();
  });
});
