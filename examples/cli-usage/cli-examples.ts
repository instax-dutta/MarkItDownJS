#!/usr/bin/env node

/**
 * This file demonstrates the CLI usage patterns for MarkItDownJS.
 *
 * To use the actual CLI:
 *   npx markitdownjs convert <file>
 *   npx markitdownjs batch <dir> --output <dir>
 *   npx markitdownjs watch <dir> --output <dir>
 *   npx markitdownjs serve --port 3000
 *
 * This script shows how to achieve the same results programmatically.
 */

import { MarkItDown } from "markitdownjs";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";

async function main() {
  const md = new MarkItDown();

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "convert": {
      const filePath = args[1];
      const outputPath = args[2];

      if (!filePath) {
        console.error("Usage: tsx cli-examples.ts convert <file> [output]");
        process.exit(1);
      }

      const buffer = readFileSync(filePath);
      const result = await md.convert(buffer);

      if (outputPath) {
        writeFileSync(outputPath, result.markdown, "utf-8");
        console.log(`Written to ${outputPath}`);
      } else {
        console.log(result.markdown);
      }
      break;
    }

    case "batch": {
      const inputDir = args[1];
      const outputDir = args[2] ?? "./output";

      if (!inputDir) {
        console.error("Usage: tsx cli-examples.ts batch <dir> [output]");
        process.exit(1);
      }

      if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

      const files = readdirSync(inputDir);

      for (const file of files) {
        const filePath = `${inputDir}/${file}`;
        const outputPath = `${outputDir}/${file}.md`;
        console.log(`Converting ${file}...`);

        const buffer = readFileSync(filePath);
        const result = await md.convert(buffer);
        writeFileSync(outputPath, result.markdown, "utf-8");
      }

      console.log(`Batch complete. Output in ${outputDir}`);
      break;
    }

    case "info": {
      console.log("MarkItDownJS CLI Example");
      console.log("Available commands: convert, batch");
      break;
    }

    default: {
      console.log("Usage:");
      console.log("  tsx cli-examples.ts convert <file> [output]");
      console.log("  tsx cli-examples.ts batch <dir> [output]");
      console.log("  tsx cli-examples.ts info");
    }
  }
}

main().catch(console.error);
