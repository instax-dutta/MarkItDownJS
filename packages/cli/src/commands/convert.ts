import { Command } from "commander";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { MarkItDown } from "@markitdownjs/core";

export function registerConvertCommand(program: Command): void {
  program
    .command("convert")
    .description("Convert a document to Markdown")
    .argument("<file>", "File to convert")
    .option("-o, --output <path>", "Output file path")
    .option("-f, --format <format>", "Output format (markdown, json, plaintext, html)", "markdown")
    .option("-v, --verbose", "Verbose output")
    .action(
      async (file: string, options: { output?: string; format: string; verbose: boolean }) => {
        try {
          if (options.verbose) {
            console.error(`Converting: ${file}`);
          }

          const fileBuffer = await readFile(file);

          const parser = new MarkItDown();
          const result = await parser.convert({
            data: new Uint8Array(fileBuffer),
            fileName: file,
            options: {
              outputFormat: options.format as "markdown" | "json" | "plaintext" | "html",
            },
          });

          let output: string;
          switch (options.format) {
            case "json":
              output = JSON.stringify(result, null, 2);
              break;
            case "plaintext":
              output = result.markdown;
              break;
            case "html":
              output = result.markdown;
              break;
            case "markdown":
            default:
              output = result.markdown;
              break;
          }

          if (options.output) {
            await mkdir(dirname(options.output), { recursive: true });
            await writeFile(options.output, output, "utf-8");
            if (options.verbose) {
              console.error(`Written to: ${options.output}`);
            }
          } else {
            process.stdout.write(output);
          }

          if (options.verbose) {
            console.error(`Conversion completed in ${result.stats.duration.toFixed(1)}ms`);
          }
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      }
    );
}
