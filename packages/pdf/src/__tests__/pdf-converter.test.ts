import { describe, it, expect } from 'vitest';
import { PdfConverter } from '../pdf-converter.js';

describe('PdfConverter', () => {
  const converter = new PdfConverter();

  it('should detect PDF by MIME type', async () => {
    expect(await converter.canConvert({ data: '', mimeType: 'application/pdf' })).toBe(true);
  });

  it('should detect PDF by extension', async () => {
    expect(await converter.canConvert({ data: '', fileName: 'test.pdf' })).toBe(true);
    expect(await converter.canConvert({ data: '', fileName: 'DOCUMENT.PDF' })).toBe(true);
  });

  it('should detect PDF by magic bytes', async () => {
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(await converter.canConvert({ data: pdfHeader })).toBe(true);
  });

  it('should detect PDF from ArrayBuffer', async () => {
    const buffer = new ArrayBuffer(8);
    const view = new Uint8Array(buffer);
    view[0] = 0x25; view[1] = 0x50; view[2] = 0x44; view[3] = 0x46;
    expect(await converter.canConvert({ data: buffer })).toBe(true);
  });

  it('should reject non-PDF files', async () => {
    expect(await converter.canConvert({ data: 'hello', fileName: 'test.txt' })).toBe(false);
    expect(await converter.canConvert({ data: new Uint8Array([0x00, 0x01, 0x02, 0x03]) })).toBe(false);
  });

  it('should return fallback markdown for invalid PDF data', async () => {
    const result = await converter.convert({
      data: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x00]),
      mimeType: 'application/pdf',
    });
    expect(result.markdown).toContain('[PDF content could not be extracted]');
    expect(result.ast).toBeDefined();
    expect(result.ast!.type).toBe('document');
  });
});
