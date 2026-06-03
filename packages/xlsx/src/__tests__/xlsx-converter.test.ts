import { describe, it, expect } from 'vitest';
import { XlsxConverter } from '../xlsx-converter.js';

describe('XlsxConverter', () => {
  const converter = new XlsxConverter();

  it('should detect XLSX by MIME type', async () => {
    expect(await converter.canConvert({
      data: '',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })).toBe(true);
  });

  it('should detect XLSX by extension', async () => {
    expect(await converter.canConvert({ data: '', fileName: 'data.xlsx' })).toBe(true);
  });

  it('should detect XLSX by PK magic bytes (ZIP)', async () => {
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(await converter.canConvert({ data: zipHeader })).toBe(true);
  });

  it('should reject non-XLSX files', async () => {
    expect(await converter.canConvert({ data: 'hello', fileName: 'test.txt' })).toBe(false);
  });
});
