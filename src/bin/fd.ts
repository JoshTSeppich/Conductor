#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(here, '..', '..', 'package.json'), 'utf8'),
) as { version: string };

const program = new Command();
program
  .name('fd')
  .description('Foxworks Dispatch — tmux bridge for Claude Code sessions.')
  .version(pkg.version);

program.parse(process.argv);
