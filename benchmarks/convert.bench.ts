import { describe, bench } from 'vitest';
import { MarkItDown } from '../packages/core/dist/index.js';
import { HtmlConverter } from '../packages/html/dist/index.js';
import { CsvConverter } from '../packages/csv/dist/index.js';
import { JsonConverter } from '../packages/json/dist/index.js';

// Create test data
const htmlData = '<html><body>' +
  '<h1>Title</h1>'.repeat(10) +
  '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50) + '</p>' +
  '<table><tr><th>A</th><th>B</th></tr>' + '<tr><td>1</td><td>2</td></tr>'.repeat(20) + '</table>' +
  '</body></html>';

const csvData = 'id,name,email,age,city\n' +
  Array.from({ length: 1000 }, (_, i) => `${i},user${i},user${i}@example.com,${20 + (i % 50)},City${i % 10}`).join('\n');

const jsonData = JSON.stringify(
  Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
  }))
);

describe('HTML Conversion', () => {
  const parser = new MarkItDown();
  parser.getRegistry().register(new HtmlConverter());

  bench('convert small HTML', async () => {
    await parser.convert({ data: '<h1>Title</h1><p>Content</p>', mimeType: 'text/html' });
  });

  bench('convert large HTML', async () => {
    await parser.convert({ data: htmlData, mimeType: 'text/html' });
  });
});

describe('CSV Conversion', () => {
  const parser = new MarkItDown();
  parser.getRegistry().register(new CsvConverter());

  bench('convert small CSV', async () => {
    await parser.convert({ data: 'a,b,c\n1,2,3', mimeType: 'text/csv' });
  });

  bench('convert large CSV (1000 rows)', async () => {
    await parser.convert({ data: csvData, mimeType: 'text/csv' });
  });
});

describe('JSON Conversion', () => {
  const parser = new MarkItDown();
  parser.getRegistry().register(new JsonConverter());

  bench('convert small JSON', async () => {
    await parser.convert({ data: '{"key":"value"}', mimeType: 'application/json' });
  });

  bench('convert large JSON array (1000 items)', async () => {
    await parser.convert({ data: jsonData, mimeType: 'application/json' });
  });
});
