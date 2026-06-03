import { describe, it, expect } from 'vitest';
import { XmlConverter } from '../xml-converter.js';

describe('XmlConverter', () => {
  const converter = new XmlConverter();

  it('should detect XML by MIME type', async () => {
    expect(await converter.canConvert({ data: '', mimeType: 'application/xml' })).toBe(true);
    expect(await converter.canConvert({ data: '', mimeType: 'text/xml' })).toBe(true);
  });

  it('should detect XML by extension', async () => {
    expect(await converter.canConvert({ data: '', fileName: 'test.xml' })).toBe(true);
    expect(await converter.canConvert({ data: '', fileName: 'feed.rss' })).toBe(true);
    expect(await converter.canConvert({ data: '', fileName: 'feed.atom' })).toBe(true);
  });

  it('should detect XML by content', async () => {
    expect(await converter.canConvert({ data: '<?xml version="1.0"?>\n<root/>' })).toBe(true);
    expect(await converter.canConvert({ data: '<root><child/></root>' })).toBe(true);
  });

  it('should reject non-XML content', async () => {
    expect(await converter.canConvert({ data: 'Hello world', fileName: 'test.txt' })).toBe(false);
  });

  it('should convert simple XML to markdown', async () => {
    const result = await converter.convert({
      data: '<root><name>Test</name></root>',
      mimeType: 'application/xml',
    });
    expect(result.markdown).toBeDefined();
    expect(result.ast).toBeDefined();
    expect(result.ast!.type).toBe('document');
  });

  it('should convert RSS feed to markdown with entries', async () => {
    const rss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <item>
      <title>First Post</title>
      <link>https://example.com/1</link>
      <description>This is the first post</description>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/2</link>
      <description>Another post</description>
    </item>
  </channel>
</rss>`;
    const result = await converter.convert({ data: rss, mimeType: 'application/rss+xml' });
    expect(result.markdown).toContain('My Blog');
    expect(result.markdown).toContain('First Post');
    expect(result.markdown).toContain('Second Post');
    expect(result.markdown).toContain('https://example.com/1');
    expect(result.headings.length).toBeGreaterThan(0);
  });

  it('should convert Atom feed', async () => {
    const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Entry 1</title>
    <link href="https://example.com/e1"/>
    <summary>Summary of entry 1</summary>
  </entry>
</feed>`;
    const result = await converter.convert({ data: atom, mimeType: 'application/atom+xml' });
    expect(result.markdown).toContain('Atom Feed');
    expect(result.markdown).toContain('Entry 1');
  });

  it('should include XML source code block', async () => {
    const result = await converter.convert({
      data: '<root><child>value</child></root>',
      mimeType: 'application/xml',
    });
    expect(result.markdown).toContain('```xml');
  });

  it('should handle malformed XML gracefully', async () => {
    const result = await converter.convert({
      data: '<unclosed>',
      mimeType: 'application/xml',
    });
    expect(result.markdown).toBeDefined();
    expect(result.ast).toBeDefined();
  });
});
