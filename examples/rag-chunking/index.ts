import { createMarkItDown, DocumentChunker, HeadingChunkingStrategy } from "@markitdownjs/markitdownjs";

async function main() {
  const md = createMarkItDown();

  // Convert an HTML document with structure
  const html = `
    <html>
      <body>
        <h1>Introduction</h1>
        <p>MarkItDownJS converts any document to Markdown.</p>
        <p>It supports PDFs, Office docs, and more.</p>

        <h2>Features</h2>
        <p>AST-first architecture ensures structured output.</p>
        <p>Plugins allow custom converters.</p>

        <h2>Chunking</h2>
        <p>Built-in chunking strategies for RAG.</p>
        <p>Heading, page, semantic, and fixed strategies.</p>

        <h3>Heading Strategy</h3>
        <p>Splits by document headings.</p>
        <p>Preserves the heading hierarchy.</p>

        <h3>Token Strategy</h3>
        <p>Splits by token count.</p>
        <p>Useful for fixed-size windows.</p>

        <h1>Getting Started</h1>
        <p>Install via npm: npm install @markitdownjs/markitdownjs</p>
        <p>Import and create an instance.</p>

        <h2>Quick Start</h2>
        <p>Create a MarkItDown instance and convert a file.</p>
      </body>
    </html>
  `;

  // Method 1: Auto-chunking via convert() options
  console.log("=== Method 1: Auto-chunking in convert() ===\n");

  const result = await md.convert({
    data: html,
    mimeType: "text/html",
    options: {
      chunking: {
        enabled: true,
        strategy: "heading",
        maxTokens: 100,
        headingDepth: 3,
      },
    },
  });

  console.log(`Generated ${result.chunks?.length ?? 0} chunks\n`);

  for (let i = 0; i < (result.chunks?.length ?? 0); i++) {
    const chunk = result.chunks![i]!;
    console.log(`Chunk ${i + 1}:`);
    console.log(`  Heading Path: ${chunk.metadata.headingPath.join(" > ")}`);
    console.log(`  Tokens: ${chunk.metadata.tokenCount}`);
    console.log(`  Content: ${chunk.content.substring(0, 80)}...`);
    console.log(`  Content Type: ${chunk.metadata.contentType}`);
    console.log();
  }

  // Method 2: Manual chunking with DocumentChunker
  console.log("=== Method 2: Manual chunking with DocumentChunker ===\n");

  const result2 = await md.convert({ data: html, mimeType: "text/html" });

  const chunker = new DocumentChunker();

  const headingChunks = chunker.chunk(result2.ast!, {
    strategy: "heading",
    maxTokens: 80,
    headingDepth: 2,
    sourceFile: "example.html",
  });

  console.log(`Heading strategy: ${headingChunks.length} chunks`);
  for (const chunk of headingChunks) {
    console.log(`  ${chunk.metadata.headingPath.join(" > ")} (${chunk.metadata.tokenCount} tokens)`);
  }

  // Demonstrate custom strategy registration
  const customStrategy = new HeadingChunkingStrategy();
  chunker.registerStrategy(customStrategy);
  console.log(`\nRegistered strategies: ${chunker.listStrategies().join(", ")}`);
}

main().catch(console.error);
