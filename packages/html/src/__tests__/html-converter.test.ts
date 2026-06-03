import { describe, it, expect } from 'vitest';
import { HtmlConverter } from '../html-converter.js';

describe('HtmlConverter', () => {
  const converter = new HtmlConverter();

  it('should convert HTML headings', async () => {
    const result = await converter.convert({
      data: '<html><body><h1>Title</h1><h2>Subtitle</h2></body></html>',
      mimeType: 'text/html',
    });
    expect(result.markdown).toContain('# Title');
    expect(result.markdown).toContain('## Subtitle');
  });

  it('should convert HTML tables', async () => {
    const result = await converter.convert({
      data: '<html><body><table><tr><th>Name</th><th>Age</th></tr><tr><td>John</td><td>30</td></tr></table></body></html>',
      mimeType: 'text/html',
    });
    expect(result.markdown).toContain('| Name |');
    expect(result.markdown).toContain('| John |');
  });

  it('should convert HTML lists', async () => {
    const result = await converter.convert({
      data: '<html><body><ul><li>Item 1</li><li>Item 2</li></ul></body></html>',
      mimeType: 'text/html',
    });
    expect(result.markdown).toContain('Item 1');
    expect(result.markdown).toContain('Item 2');
  });

  it('should convert links', async () => {
    const result = await converter.convert({
      data: '<html><body><a href="https://example.com">Example</a></body></html>',
      mimeType: 'text/html',
    });
    expect(result.markdown).toContain('[Example](https://example.com)');
  });

  it('should produce AST', async () => {
    const result = await converter.convert({
      data: '<html><body><p>Hello</p></body></html>',
      mimeType: 'text/html',
    });
    expect(result.ast).toBeDefined();
  });
});
