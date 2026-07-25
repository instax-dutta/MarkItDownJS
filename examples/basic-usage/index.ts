import { createMarkItDown } from "markitdownjs";

async function main() {
  // Create a fully-configured instance with all converters + chunker
  const md = createMarkItDown();

  // Convert HTML string
  const htmlResult = await md.convert({
    data: "<html><body><h1>Hello World</h1><p>This is a test.</p></body></html>",
    mimeType: "text/html",
  });
  console.log("=== HTML Conversion ===");
  console.log(htmlResult.markdown);

  // Convert JSON
  const jsonResult = await md.convert({
    data: JSON.stringify({ name: "John", age: 30, city: "NYC" }),
    mimeType: "application/json",
  });
  console.log("\n=== JSON Conversion ===");
  console.log(jsonResult.markdown);

  // Convert CSV
  const csvResult = await md.convert({
    data: "name,age,city\nJohn,30,NYC\nJane,25,LA",
    mimeType: "text/csv",
  });
  console.log("\n=== CSV Conversion ===");
  console.log(csvResult.markdown);

  // With chunking enabled
  const chunkedResult = await md.convert({
    data: "<html><body><h1>Section 1</h1><p>Content A.</p><h2>Subsection</h2><p>Content B.</p><h1>Section 2</h1><p>Content C.</p></body></html>",
    mimeType: "text/html",
    options: {
      chunking: { enabled: true, strategy: "heading", maxTokens: 200 },
    },
  });
  console.log("\n=== Chunked Result ===");
  for (const chunk of chunkedResult.chunks ?? []) {
    console.log(`[${chunk.metadata.headingPath.join(" > ")}] ${chunk.metadata.tokenCount} tokens`);
    console.log(chunk.content);
    console.log("---");
  }
}

main().catch(console.error);
