#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { Command } from 'commander';
import {
  runInitDispatch,
  runListDispatch,
  runPullDispatch,
  runSendDispatch,
  runStatusDispatch,
} from '../lib/dispatch.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(here, '..', '..', 'package.json'), 'utf8'),
) as { version: string };

async function prompt(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(
      `missing required value; stdin is not a TTY so I cannot prompt for "${question}". Pass the corresponding flag.`,
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question}: `)).trim();
    if (!answer) throw new Error(`no value entered for "${question}"`);
    return answer;
  } finally {
    rl.close();
  }
}

const program = new Command();
program
  .name('fd')
  .description('Foxworks Dispatch — tmux bridge for Claude Code sessions.')
  .version(pkg.version);

program
  .command('init')
  .description('Register a session in the local registry.')
  .argument('<name>', 'short name used for fd send / fd pull')
  .option('--cwd <path>', 'working directory of the Claude Code session')
  .option('--target <target>', 'tmux target pane, e.g. sherpa:0.0')
  .action(async (name: string, options: { cwd?: string; target?: string }) => {
    const cwd = options.cwd ?? (await prompt('cwd (absolute path of the session repo)'));
    const target = options.target ?? (await prompt('tmux target (session:window.pane)'));
    // CLI-T01: route through dispatcher (default useHttp=false →
    // v1 path; T04 will invert based on /v2/health probe).
    await runInitDispatch({ name, cwd, target });
    console.log(`registered "${name}" -> ${target} (cwd ${cwd})`);
  });

program
  .command('send')
  .description('Send a prompt file to a registered session.')
  .argument('<name>', 'registered session name (see fd list)')
  .argument('<prompt-file>', 'path to the prompt file to deliver')
  .action(async (name: string, promptFile: string) => {
    await runSendDispatch({ name, promptFile });
    console.log(`sent ${promptFile} → ${name}`);
  });

program
  .command('pull')
  .description('Read HANDOFF.md from a registered session, print it, and copy it to the clipboard.')
  .argument('<name>', 'registered session name (see fd list)')
  .action(async (name: string) => {
    await runPullDispatch({ name });
  });

program
  .command('list')
  .description('List registered sessions as tab-separated lines (name\\tcwd\\ttmux_target).')
  .action(async () => {
    const out = await runListDispatch();
    if (out) process.stdout.write(out);
  });

program
  .command('status')
  .description('Live TUI showing all sessions, their state, and age. Refreshes every 2s. Ctrl+C to exit.')
  .action(async () => {
    // CLI-T02: route through dispatcher (default useHttp=false →
    // v1 polling; T04 will invert based on /v2/health probe).
    await runStatusDispatch();
  });

program.parseAsync(process.argv).catch((err: Error) => {
  process.stderr.write(`fd: ${err.message}\n`);
  process.exit(1);
});
