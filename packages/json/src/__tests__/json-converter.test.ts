import { describe, it, expect } from 'vitest';
import { JsonConverter } from '../json-converter.js';

describe('JsonConverter', () => {
  const converter = new JsonConverter();

  it('should convert JSON object to markdown code block', async () => {
    const result = await converter.convert({
      data: '{"name": "John"}',
      mimeType: 'application/json',
    });
    expect(result.markdown).toContain('json');
    expect(result.markdown).toContain('John');
  });

  it('should convert JSON array to table', async () => {
    const data = JSON.stringify([{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }]);
    const result = await converter.convert({ data, mimeType: 'application/json' });
    expect(result.markdown).toContain('| name |');
  });
});
