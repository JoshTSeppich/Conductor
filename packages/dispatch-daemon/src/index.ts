/**
 * Conductor daemon entry point.
 *
 * Invoked by launchd via the plist's ProgramArguments (see
 * DAEMON-S04 ADR + DAEMON-T18 installer). Spawns the HTTP server,
 * registers signal handlers, then stays alive until SIGTERM/SIGINT
 * triggers graceful shutdown.
 *
 * Z-2 §3.4 mechanical-translation carve-out (third Round 2 exercise
 * after T18 + Z-3): pass staticRoot default so production launchd-
 * launched daemon serves dispatch-web/dist as the SPA. Z-3 pre-reg
 * Decision 2 verbatim specified this default; Z-3 green left it
 * undefined (test-injectable opt only). Z-2 closes the gap so
 * "open browser → web UI receive event" composition works
 * end-to-end on fresh install.
 *
 * Path resolution: import.meta.dirname for this file resolves to
 * <repo>/packages/dispatch-daemon/src — '../../dispatch-web/dist'
 * lands at <repo>/packages/dispatch-web/dist. Works under Z-1
 * Path B plist (WorkingDirectory = repo root; tsx loads .ts
 * source from src/) because import.meta.dirname is the source-
 * file location regardless of cwd.
 */

import { resolve } from 'node:path';
import { startup } from './lifecycle/startup.js';

async function main(): Promise<void> {
  const staticRoot = resolve(import.meta.dirname, '../../dispatch-web/dist');
  await startup({ staticRoot });
  // Process stays alive because Fastify's HTTP server keeps the
  // event loop busy. Signal handlers registered by startup() will
  // trigger shutdown + exit(0) on SIGTERM/SIGINT.
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('daemon startup failed:', msg);
  process.exit(1);
});
