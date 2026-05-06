#!/usr/bin/env node
/**
 * MB-F-DAEMON-CONCURRENT-RACE — child entry: v2-path writer.
 *
 * Invoked as a tsx-driven Node sub-process by spawn-daemon-write.ts.
 * Mirrors the daemon's read-modify-write contract used by route
 * handlers (sessions/prompts/handoff/transitions all readRegistryV2 →
 * mutate → writeRegistryV2). Bypasses Fastify entirely; the race
 * surface is the writeAtomicJson + readback retry path.
 *
 * Args supplied via env var RACE_ARGS (JSON):
 *   {
 *     registryPath: string,
 *     mutate: { session: string, field: string, value: unknown },
 *     barrierPath?: string  // if set, snapshot then await before write
 *   }
 *
 * Stdout protocol mirrors cli-writer-child:
 *   "READY\n" / "DONE\n" / "ERROR <msg>\n"
 */

import { readRegistryV2, writeRegistryV2 } from '../../../../src/migration/schema-v2.js';
import type { RegistryV2 } from 'dispatch-core/src/v2/schema.js';
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

  const registry: RegistryV2 = await readRegistryV2(args.registryPath);

  const session = registry.sessions[args.mutate.session];
  if (!session) {
    throw new Error(
      `daemon-writer-child: session "${args.mutate.session}" not present in registry`,
    );
  }
  (session as Record<string, unknown>)[args.mutate.field] = args.mutate.value;

  process.stdout.write('READY\n');

  if (args.barrierPath) {
    await awaitBarrier(args.barrierPath);
  }

  await writeRegistryV2(args.registryPath, registry);

  process.stdout.write('DONE\n');
}

main().catch((err: Error) => {
  process.stderr.write(`ERROR ${err.message}\n`);
  process.exit(1);
});
