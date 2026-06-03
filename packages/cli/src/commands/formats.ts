import { Command } from 'commander';
import { getSupportedExtensions, getSupportedMimeTypes } from '@markitdownjs/shared';

export function registerFormatsCommand(program: Command): void {
  program
    .command('formats')
    .description('List all supported file formats')
    .action(() => {
      const extensions = getSupportedExtensions();
      const mimeTypes = getSupportedMimeTypes();

      console.log('Supported Formats:');
      console.log('==================\n');

      const rows: string[][] = [];
      for (let i = 0; i < extensions.length; i++) {
        rows.push([extensions[i] ?? '', mimeTypes[i] ?? '']);
      }

      const maxExt = Math.max(...rows.map(r => (r[0] ?? '').length), 'Extension'.length);

      console.log(`${'Extension'.padEnd(maxExt)}  MIME Type`);
      console.log(`${'-'.repeat(maxExt)}  ${'-'.repeat(40)}`);
      for (const row of rows) {
        console.log(`${(row[0] ?? '').padEnd(maxExt)}  ${row[1] ?? ''}`);
      }

      console.log(`\nTotal: ${extensions.length} formats supported`);
    });
}
