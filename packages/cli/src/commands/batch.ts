import { Command } from 'commander';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, extname, resolve, relative, dirname } from 'path';
import { MarkItDown } from '@markitdownjs/core';

export function registerBatchCommand(program: Command): void {
  program
    .command('batch')
    .description('Batch convert all files in a directory')
    .argument('[dir]', 'Directory to process', '.')
    .option('-o, --output <dir>', 'Output directory')
    .option('-e, --extensions <exts>', 'Comma-separated extensions to process', '.pdf,.docx,.xlsx,.pptx,.html,.csv,.json,.xml')
    .option('-c, --concurrency <n>', 'Max concurrent conversions', '5')
    .option('-v, --verbose', 'Verbose output')
    .action(async (dir: string, options: { output?: string; extensions: string; concurrency: string; verbose: boolean }) => {
      const inputDir = resolve(dir);
      const outputDir = options.output ? resolve(options.output) : inputDir;
      const extensions = options.extensions.split(',').map(e => e.trim());
      const concurrency = parseInt(options.concurrency, 10);
      const parser = new MarkItDown();

      async function getFiles(dirPath: string): Promise<string[]> {
        const entries = await readdir(dirPath, { withFileTypes: true });
        const files: string[] = [];

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);
          if (entry.isDirectory()) {
            files.push(...await getFiles(fullPath));
          } else if (entry.isFile() && extensions.includes(extname(entry.name).toLowerCase())) {
            files.push(fullPath);
          }
        }

        return files;
      }

      try {
        const files = await getFiles(inputDir);
        let converted = 0;
        let failed = 0;

        console.error(`Found ${files.length} files to convert`);

        async function processFile(filePath: string): Promise<void> {
          try {
            const content = await readFile(filePath);
            const result = await parser.convert({
              data: new Uint8Array(content),
              fileName: filePath,
            });

            const relPath = relative(inputDir, filePath);
            const mdPath = join(outputDir, relPath.replace(extname(filePath), '.md'));
            await mkdir(dirname(mdPath), { recursive: true });
            await writeFile(mdPath, result.markdown, 'utf-8');

            converted++;
            if (options.verbose) {
              console.error(`[${converted}/${files.length}] Converted: ${relPath}`);
            }
          } catch (error) {
            failed++;
            console.error(`Failed: ${filePath} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        for (let i = 0; i < files.length; i += concurrency) {
          const batch = files.slice(i, i + concurrency);
          await Promise.all(batch.map(processFile));
        }

        console.error(`\nBatch complete: ${converted} converted, ${failed} failed`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
