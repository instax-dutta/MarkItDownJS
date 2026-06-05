import { Command } from "commander";
import { watch, readFile, writeFile, stat, readdir } from "fs/promises";
import { join, basename, extname, resolve } from "path";
import { MarkItDown } from "@markitdownjs/core";

export function registerWatchCommand(program: Command): void {
  program
    .command("watch")
    .description("Watch a directory and convert new/modified files to Markdown")
    .argument("[dir]", "Directory to watch", ".")
    .option("-r, --recursive", "Watch subdirectories recursively")
    .option("-v, --verbose", "Verbose output")
    .action(async (dir: string, options: { recursive: boolean; verbose: boolean }) => {
      const watchDir = resolve(dir);
      const parser = new MarkItDown();
      const processedFiles = new Set<string>();

      console.error(`Watching: ${watchDir}`);

      async function convertFile(filePath: string): Promise<void> {
        try {
          const content = await readFile(filePath);
          const result = await parser.convert({
            data: new Uint8Array(content),
            fileName: filePath,
          });

          const mdPath = join(watchDir, basename(filePath, extname(filePath)) + ".md");
          await writeFile(mdPath, result.markdown, "utf-8");

          if (options.verbose) {
            console.error(`Converted: ${filePath} -> ${mdPath}`);
          }
        } catch (error) {
          console.error(
            `Error converting ${filePath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      async function scanDirectory(dirPath: string): Promise<void> {
        try {
          const entries = await readdir(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            if (entry.isDirectory() && options.recursive) {
              await scanDirectory(fullPath);
            } else if (entry.isFile()) {
              processedFiles.add(fullPath);
              await convertFile(fullPath);
            }
          }
        } catch (error) {
          console.error(
            `Error scanning ${dirPath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      await scanDirectory(watchDir);

      try {
        const watcher = watch(watchDir, { recursive: options.recursive });

        for await (const event of watcher) {
          if (!event.filename) continue;

          const filePath = join(watchDir, event.filename);

          try {
            const fileStat = await stat(filePath);
            if (!fileStat.isFile()) continue;
          } catch {
            continue;
          }

          if (!processedFiles.has(filePath)) {
            processedFiles.add(filePath);
            if (options.verbose) {
              console.error(`New file detected: ${filePath}`);
            }
          }

          await convertFile(filePath);
        }
      } catch (error) {
        console.error(`Watch error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
