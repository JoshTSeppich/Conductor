/**
 * Conductor daemon entry point.
 *
 * Invoked by launchd via the plist's ProgramArguments (see
 * DAEMON-S04 ADR + DAEMON-T18 installer). Spawns the HTTP server,
 * registers signal handlers, then stays alive until SIGTERM/SIGINT
 * triggers graceful shutdown.
 */

import { startup } from './lifecycle/startup.js';

async function main(): Promise<void> {
  await startup();
  // Process stays alive because Fastify's HTTP server keeps the
  // event loop busy. Signal handlers registered by startup() will
  // trigger shutdown + exit(0) on SIGTERM/SIGINT.
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('daemon startup failed:', msg);
  process.exit(1);
});
