import { MarkItDown } from '@markitdownjs/core';
import { PdfConverter } from '@markitdownjs/pdf';
import { DocxConverter } from '@markitdownjs/docx';
import { HtmlConverter } from '@markitdownjs/html';
import { CsvConverter } from '@markitdownjs/csv';
import { JsonConverter } from '@markitdownjs/json';

async function main() {
  const parser = new MarkItDown();
  const registry = parser.getRegistry();

  // Register converters
  registry.register(new PdfConverter());
  registry.register(new DocxConverter());
  registry.register(new HtmlConverter());
  registry.register(new CsvConverter());
  registry.register(new JsonConverter());

  // Convert a file
  // const result = await parser.convert('./document.pdf');
  // console.log(result.markdown);

  // Convert HTML string
  const htmlResult = await parser.convert({
    data: '<html><body><h1>Hello World</h1><p>This is a test.</p></body></html>',
    mimeType: 'text/html',
  });
  console.log('HTML conversion result:');
  console.log(htmlResult.markdown);

  // Convert JSON
  const jsonResult = await parser.convert({
    data: JSON.stringify({ name: 'John', age: 30, city: 'NYC' }),
    mimeType: 'application/json',
  });
  console.log('\nJSON conversion result:');
  console.log(jsonResult.markdown);

  // Convert CSV
  const csvResult = await parser.convert({
    data: 'name,age,city\nJohn,30,NYC\nJane,25,LA',
    mimeType: 'text/csv',
  });
  console.log('\nCSV conversion result:');
  console.log(csvResult.markdown);
}

main().catch(console.error);
