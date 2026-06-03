import { describe, it, expect } from 'vitest';
import { DefaultConverterRegistry } from '../registry.js';
import type { Converter, ConversionInput, ConversionResult } from '@markitdownjs/shared';

function createMockConverter(id: string, mimeTypes: string[], extensions: string[]): Converter {
  return {
    id,
    supportedMimeTypes: mimeTypes,
    supportedExtensions: extensions,
    async canConvert(input: ConversionInput): Promise<boolean> {
      if (input.mimeType && mimeTypes.includes(input.mimeType)) return true;
      if (input.fileName) {
        const ext = '.' + input.fileName.split('.').pop();
        if (extensions.includes(ext)) return true;
      }
      return false;
    },
    async convert(_input: ConversionInput): Promise<ConversionResult> {
      return {
        markdown: 'test',
        metadata: {},
        assets: [],
        tables: [],
        images: [],
        headings: [],
        format: 'markdown',
        converterId: id,
        stats: { startTime: 0, endTime: 0, duration: 0, inputSize: 0, outputSize: 0 },
      };
    },
  };
}

describe('DefaultConverterRegistry', () => {
  it('should register and retrieve converters', () => {
    const registry = new DefaultConverterRegistry();
    const converter = createMockConverter('test', ['text/plain'], ['.txt']);
    registry.register(converter);
    expect(registry.get('test')).toBe(converter);
  });

  it('should find converter by MIME type', () => {
    const registry = new DefaultConverterRegistry();
    const converter = createMockConverter('pdf', ['application/pdf'], ['.pdf']);
    registry.register(converter);
    expect(registry.getByMimeType('application/pdf')).toBe(converter);
  });

  it('should find converter by extension', () => {
    const registry = new DefaultConverterRegistry();
    const converter = createMockConverter('html', ['text/html'], ['.html', '.htm']);
    registry.register(converter);
    expect(registry.getByExtension('.html')).toBe(converter);
    expect(registry.getByExtension('.htm')).toBe(converter);
  });

  it('should list all converters', () => {
    const registry = new DefaultConverterRegistry();
    registry.register(createMockConverter('a', [], []));
    registry.register(createMockConverter('b', [], []));
    expect(registry.list()).toHaveLength(2);
  });

  it('should unregister converters', () => {
    const registry = new DefaultConverterRegistry();
    registry.register(createMockConverter('test', [], []));
    registry.unregister('test');
    expect(registry.get('test')).toBeUndefined();
  });

  it('should find converter via canConvert', async () => {
    const registry = new DefaultConverterRegistry();
    const converter = createMockConverter('pdf', ['application/pdf'], ['.pdf']);
    registry.register(converter);
    const found = await registry.canConvert({ data: new Uint8Array(), mimeType: 'application/pdf' });
    expect(found).toBe(converter);
  });
});
