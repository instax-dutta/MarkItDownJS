#!/usr/bin/env node
import { Command } from 'commander';
import { registerConvertCommand } from './commands/convert.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerBatchCommand } from './commands/batch.js';
import { registerServeCommand } from './commands/serve.js';
import { registerFormatsCommand } from './commands/formats.js';

const program = new Command();

program
  .name('markitdownjs')
  .description('Universal document-to-Markdown conversion tool')
  .version('0.1.0');

registerConvertCommand(program);
registerWatchCommand(program);
registerBatchCommand(program);
registerServeCommand(program);
registerFormatsCommand(program);

program.parse();
