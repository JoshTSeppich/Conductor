// MB-T08 Cluster 4 GREEN — runnable smoke entry.
//
// Operator runs `pnpm --filter dispatch-workstation smoke` (or the package
// directory's `pnpm smoke`). Builds dist/, then launches the harness against
// the real Electron app and exercises onboarding + spawn + clean exit.
//
// Per V3_TICKETS.md MB-T08 acceptance + vision §8.2: smoke-test surface
// exists for the v3.0 capability checklist. CI integration is operator
// territory (out of scope for this ticket).
import { ElectronProcessController } from './electron-process-controller.js';
import { SmokeHarness } from './smoke-harness.js';

const SMOKE_API_KEY = process.env.SMOKE_API_KEY ?? 'sk-ant-smoke-placeholder';
const SMOKE_REPO_PATH = process.env.SMOKE_REPO_PATH ?? process.cwd();
const SMOKE_SESSION_NAME =
  process.env.SMOKE_SESSION_NAME ?? `smoke-${Date.now()}`;

async function main(): Promise<void> {
  const ctrl = new ElectronProcessController();
  const harness = new SmokeHarness({ processController: ctrl });

  process.stdout.write('[smoke] launching workstation…\n');
  await harness.launch();

  try {
    process.stdout.write('[smoke] running onboarding…\n');
    await harness.runOnboarding({ apiKey: SMOKE_API_KEY });

    process.stdout.write(
      `[smoke] spawning session "${SMOKE_SESSION_NAME}" in ${SMOKE_REPO_PATH}…\n`,
    );
    await harness.spawnSession({
      repoPath: SMOKE_REPO_PATH,
      sessionName: SMOKE_SESSION_NAME,
    });

    process.stdout.write('[smoke] all phases ok; shutting down…\n');
  } finally {
    const code = await harness.exit();
    process.stdout.write(`[smoke] exited with code ${code ?? '<signal>'}\n`);
    process.exit(code === 0 ? 0 : 1);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[smoke] FAILED: ${(err as Error).message}\n`);
  process.exit(1);
});
