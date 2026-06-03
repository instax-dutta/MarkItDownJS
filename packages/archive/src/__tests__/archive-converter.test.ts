import { describe, it, expect } from 'vitest';
import { ArchiveConverter } from '../archive-converter.js';
import JSZip from 'jszip';

describe('ArchiveConverter', () => {
  const converter = new ArchiveConverter();

  it('should detect ZIP by MIME type', async () => {
    expect(await converter.canConvert({ data: '', mimeType: 'application/zip' })).toBe(true);
  });

  it('should detect ZIP by extension', async () => {
    expect(await converter.canConvert({ data: '', fileName: 'test.zip' })).toBe(true);
  });

  it('should detect ZIP by magic bytes', async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(await converter.canConvert({ data: zipBytes })).toBe(true);
  });

  it('should reject non-ZIP files', async () => {
    expect(await converter.canConvert({ data: 'hello', fileName: 'test.txt' })).toBe(false);
  });

  it('should convert ZIP archive to markdown table', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'Hello World');
    zip.file('src/index.ts', 'export const x = 1;');
    const data = await zip.generateAsync({ type: 'uint8array' });

    const result = await converter.convert({ data, mimeType: 'application/zip' });

    expect(result.markdown).toContain('# Archive Contents');
    expect(result.markdown).toContain('| Path |');
    expect(result.markdown).toContain('readme.txt');
    expect(result.markdown).toContain('src/index.ts');
    expect(result.tables.length).toBe(1);
    expect(result.tables[0].headers).toEqual(['Path', 'Size', 'Type']);
  });

  it('should list directories and files', async () => {
    const zip = new JSZip();
    zip.folder('src');
    zip.file('src/app.ts', 'const app = {};');
    const data = await zip.generateAsync({ type: 'uint8array' });

    const result = await converter.convert({ data, mimeType: 'application/zip' });
    expect(result.markdown).toContain('Directory');
    expect(result.markdown).toContain('File');
  });

  it('should produce AST', async () => {
    const zip = new JSZip();
    zip.file('a.txt', 'content');
    const data = await zip.generateAsync({ type: 'uint8array' });

    const result = await converter.convert({ data, mimeType: 'application/zip' });
    expect(result.ast).toBeDefined();
    expect(result.ast!.type).toBe('document');
  });
});
