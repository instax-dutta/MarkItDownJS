import { describe, it, expect } from 'vitest';
import { CsvConverter } from '../csv-converter.js';

describe('CsvConverter', () => {
  const converter = new CsvConverter();

  it('should convert CSV to markdown table', async () => {
    const result = await converter.convert({
      data: 'name,age\nJohn,30\nJane,25',
      mimeType: 'text/csv',
    });
    expect(result.markdown).toContain('| name |');
    expect(result.markdown).toContain('| John |');
    expect(result.markdown).toContain('| Jane |');
  });

  it('should convert TSV to markdown table', async () => {
    const result = await converter.convert({
      data: 'name\tage\nJohn\t30',
      fileName: 'test.tsv',
    });
    expect(result.markdown).toContain('| name |');
  });

  it('should handle quoted fields', async () => {
    const result = await converter.convert({
      data: 'name,description\nTest,"A, test"',
      mimeType: 'text/csv',
    });
    expect(result.markdown).toContain('A, test');
  });

  it('should produce AST', async () => {
    const result = await converter.convert({
      data: 'a,b\n1,2',
      mimeType: 'text/csv',
    });
    expect(result.ast).toBeDefined();
    expect(result.ast!.type).toBe('document');
  });
});
