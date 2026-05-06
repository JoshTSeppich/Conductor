#!/usr/bin/env node
/**
 * MB-F-DAEMON-CONCURRENT-RACE — child entry: v1-path writer.
 *
 * Invoked as a tsx-driven Node sub-process by spawn-cli-write.ts.
 * Mirrors the CLI's read-modify-write contract (init/send/pull all
 * follow this shape — readRegistry → mutate one field → writeRegistry)
 * without invoking tmux, archive, or HTTP probe paths. The race
 * surface that matters is `writeRegistry` itself — exercising the v1
 * fallback's atomic-write recipe alongside the daemon's v2 recipe.
 *
 * Args supplied via env var RACE_ARGS (JSON):
 *   {
 *     registryPath: string,
 *     mutate: { session: string, field: string, value: unknown },
 *     barrierPath?: string  // if set, snapshot then await before write
 *   }
 *
 * Stdout protocol:
 *   "READY\n" — printed after read+snapshot, before barrier wait
 *   "DONE\n"  — printed after writeRegistry returns
 *   "ERROR <msg>\n" — printed on any failure; exit code 1
 */

import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { writeRegistry } from 'dispatch-core/src/registry/write.js';
import type { Registry } from 'dispatch-core/src/registry/schema.js';
import { awaitBarrier } from './barrier.js';

interface ChildArgs {
  registryPath: string;
  mutate: { session: string; field: string; value: unknown };
  barrierPath?: string;
}

async function main(): Promise<void> {
  const raw = process.env.RACE_ARGS;
  if (!raw) throw new Error('RACE_ARGS env var not set');
  const args = JSON.parse(raw) as ChildArgs;

  const registry: Registry = await readRegistry(args.registryPath);

  const session = registry.sessions[args.mutate.session];
  if (!session) {
    throw new Error(
      `cli-writer-child: session "${args.mutate.session}" not present in registry`,
    );
  }
  (session as Record<string, unknown>)[args.mutate.field] = args.mutate.value;

  process.stdout.write('READY\n');

  if (args.barrierPath) {
    await awaitBarrier(args.barrierPath);
  }

  await writeRegistry(args.registryPath, registry);

  process.stdout.write('DONE\n');
}

main().catch((err: Error) => {
  process.stderr.write(`ERROR ${err.message}\n`);
  process.exit(1);
});
