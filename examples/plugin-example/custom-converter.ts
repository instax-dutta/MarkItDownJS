import type { Converter, ConversionInput, ConversionResult } from '@markitdownjs/shared';

export class CustomFormatConverter implements Converter {
  readonly id = 'custom-format';
  readonly supportedMimeTypes = ['application/x-custom'];
  readonly supportedExtensions = ['.custom'];

  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType === 'application/x-custom') return true;
    if (input.fileName?.endsWith('.custom')) return true;
    return false;
  }

  async convert(input: ConversionInput): Promise<ConversionResult> {
    const data = typeof input.data === 'string'
      ? input.data
      : new TextDecoder().decode(input.data instanceof Uint8Array ? input.data : new Uint8Array(0));

    return {
      markdown: `# Custom Format\n\n${data}`,
      metadata: {},
      assets: [],
      tables: [],
      images: [],
      headings: [{ level: 1, text: 'Custom Format' }],
      format: 'markdown',
      converterId: this.id,
      stats: { startTime: 0, endTime: 0, duration: 0, inputSize: data.length, outputSize: data.length },
    };
  }
}
