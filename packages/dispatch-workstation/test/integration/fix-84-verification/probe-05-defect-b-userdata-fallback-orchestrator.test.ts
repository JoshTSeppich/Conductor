// Fix-84 / Probe 5 — Defect B userData fallback resolves orchestrator.
//
// Cairn finding #84 Defect B / Fix-A resolution: with all three
// legacy env vars (MB_BUILD_DOC_STATE_DIR / MB_WORKSTATION_USERDATA
// / MB_APP_USERDATA) UNSET — the production configuration —
// `stateDir()` falls back to `app.getPath('userData')`. With a
// build-doc-config.json seeded at that path, the orchestrator
// chat→structured-output pipeline resolves end-to-end.
//
// This probe encodes the live runtime smoke from Fix-A's resolution
// section:
//   "Pre-seeded ~/Library/Application Support/Electron/build-doc-
//    config.json pointing at the spike fixture (packages/dispatch-
//    workstation/spikes/MB-S01/fixtures/build-doc.build.md, repoRoot
//    =<worktree root>). Same launch shape; TYPE_AND_SEND carrying
//    the spike fixture's S-01-01 triggering event for ticket MB-T05.
//    STREAM_DONE prefix observed: { 'output_type': 'action', ... }"
//
// The probe asserts STREAM_DONE preview contains an orchestrator-
// shaped output_type (action / card / multi-choice-card) — NOT the
// `text-passthrough` fallback that would indicate the orchestrator
// system prompt didn't load (i.e., readBuildDocConfig returned null
// because userData fallback didn't kick in → regression).
//
// Auto-skip-with-MANUAL pattern: probe needs a real Anthropic API
// key (env precedence path; Defect A seed is probe-03's territory)
// AND the spike fixture file. Skip with loud reason if either
// missing.
//
// MODELED: model selects output_type non-deterministically. Per
// finding #84 resolution: "the model selected output_type:'action'
// for the prompt rather than card / multi-choice-card." The probe
// accepts any of the three orchestrator-shaped types — what
// distinguishes the regression class is `text-passthrough`
// (orchestrator prompt didn't load).
//
// Pattern reference: probe-84-03 (two-boot pattern not needed here
// — Defect A seed is orthogonal; we use env-precedence path for
// the API key).
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const SPIKE_BUILD_DOC = resolve(
  PACKAGE_ROOT,
  'spikes/MB-S01/fixtures/build-doc.build.md',
);
// Worktree root (= monorepo root for this fixture) for the build-doc
// repoRoot. Per spike fixture's target_repo: monorepo path. We use the
// resolved test-A worktree root which is the workstation package's
// great-grand-parent.
const WORKTREE_ROOT = resolve(PACKAGE_ROOT, '../..');

// S-01-01 triggering event verbatim per the spike fixture scenarios/
// 01-normal-actions.json. Carrying it as a literal here (not loaded
// from JSON) so the probe's pass criterion is decoupled from fixture
// edits — if the JSON is renamed/restructured, this probe still
// drives the same prompt shape.
const S_01_01_TRIGGER =
  "Triggering event for ticket MB-T05: operator clicked 'Spawn new session' in Workstation against this build doc's target_repo. MB-T05 Red phase requires a fresh registered session.";

function awaitSentinel(
  buf: () => string,
  pattern: RegExp,
  timeoutMs: number,
  child: ChildProcess,
  errBuf: () => string,
): Promise<RegExpMatchArray> {
  return new Promise((resolveP, rejectP) => {
    const timer = setInterval(() => {
      const m = buf().match(pattern);
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
      }
    }, 50);
    const deadline = setTimeout(() => {
      clearInterval(timer);
      rejectP(
        new Error(
          `timeout waiting for ${pattern} after ${timeoutMs}ms; ` +
            `stdout=${JSON.stringify(buf().slice(-2000))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-2000))}`,
        ),
      );
    }, timeoutMs);
    child.once('exit', () => {
      clearInterval(timer);
      clearTimeout(deadline);
      rejectP(new Error('child exited before sentinel'));
    });
  });
}

function findRealApiKey(): { key?: string; reason: string } {
  const dogfood = process.env.CONDUCTOR_DOGFOOD_API_KEY;
  if (dogfood && dogfood.length > 0) return { key: dogfood, reason: 'CONDUCTOR_DOGFOOD_API_KEY' };
  const anth = process.env.ANTHROPIC_API_KEY;
  if (anth && anth.length > 0) return { key: anth, reason: 'ANTHROPIC_API_KEY' };
  return {
    reason:
      'neither CONDUCTOR_DOGFOOD_API_KEY nor ANTHROPIC_API_KEY set in test runner env; re-run with one for KNOWN evidence',
  };
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-84 / Probe 5 — Defect B userData fallback resolves orchestrator', () => {
  itDarwin(
    'orchestrator chat→structured-output pipeline alive when stateDir resolves via app.getPath(userData) fallback',
    async (ctx) => {
      const keyLookup = findRealApiKey();
      if (!keyLookup.key) {
        ctx.skip(`SKIPPED: ${keyLookup.reason}`);
        return;
      }
      if (!existsSync(SPIKE_BUILD_DOC)) {
        ctx.skip(
          `SKIPPED: spike fixture missing at ${SPIKE_BUILD_DOC}; ensure spikes/ directory present for KNOWN evidence`,
        );
        return;
      }
      expect(existsSync(MAIN_JS), `expected ${MAIN_JS}`).toBe(true);

      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-84-probe-05-userdata-'));
      const onbDir = mkdtempSync(join(tmpdir(), 'fix-84-probe-05-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      // Pre-seed build-doc-config.json at the userData path. With all
      // three legacy env vars unset, stateDir() resolves via
      // app.getPath('userData') → MB_USER_DATA_DIR (Probe-92 obs-infra
      // override). The seeded config carries the spike fixture's
      // build-doc location so loadSystemPrompt() can build the
      // orchestrator system prompt.
      const buildDocConfig = {
        repoRoot: WORKTREE_ROOT,
        relativePath: 'packages/dispatch-workstation/spikes/MB-S01/fixtures/build-doc.build.md',
        // allowedScopes corresponds to the build doc anchors used by
        // the orchestrator's read-scope filter; 'overview' and
        // 'tickets' are the broad-coverage scopes for MB-T05.
        allowedScopes: ['overview', 'tickets'],
      };
      writeFileSync(
        join(userDataDir, 'build-doc-config.json'),
        JSON.stringify(buildDocConfig),
        'utf8',
      );

      let stdout = '';
      let stderr = '';
      const child = spawn(ELECTRON_BIN, [MAIN_JS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
          MB_TEST_HOOKS: '1',
          MB_USER_DATA_DIR: userDataDir,
          MB_ONBOARDING_STATE_DIR: onbDir,
          // Defect A is orthogonal — env-precedence path for the API
          // key keeps this probe scoped to Defect B's userData
          // fallback specifically.
          ANTHROPIC_API_KEY: keyLookup.key,
          // Defect B precondition: ALL THREE legacy env vars MUST be
          // unset. stateDir() then walks past them and reaches
          // app.getPath('userData') == MB_USER_DATA_DIR. Spread does
          // not allow inline `delete`, so we explicitly enforce.
          MB_BUILD_DOC_STATE_DIR: undefined as unknown as string,
          MB_WORKSTATION_USERDATA: undefined as unknown as string,
          MB_APP_USERDATA: undefined as unknown as string,
          // Daemon unreachable — chat-only path, daemon-graceful
          // failure mode in HttpDaemonClient returns []. Keeps probe
          // independent of daemon state.
          FOXWORKS_DAEMON_URL: 'http://127.0.0.1:1',
          FOXWORKS_DAEMON_WS_URL: 'ws://127.0.0.1:1',
        },
      });
      child.stdout?.on('data', (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitSentinel(() => stdout, /^ONBOARDING_READY$/m, 30_000, child, () => stderr);
        await awaitSentinel(() => stdout, /^SHELL_READY$/m, 30_000, child, () => stderr);

        // Drive the chat send. With Defect B fixed AND build-doc-
        // config.json seeded at userData path → readBuildDocConfig()
        // returns the seed → loadSystemPrompt() returns the
        // orchestrator system prompt → model emits structured output
        // (output_type ∈ {action, card, multi-choice-card}).
        // Without the fix, readBuildDocConfig() throws → caught →
        // returns null → falls through to plain streamMessage →
        // model emits prose → routeOrchestratorOutput parses as
        // text-passthrough. The output_type is the discriminator.
        child.stdin?.write(`TYPE_AND_SEND ${S_01_01_TRIGGER}\n`);

        const doneOrError = await Promise.race([
          awaitSentinel(
            () => stdout,
            /^STREAM_DONE (.*)$/m,
            45_000,
            child,
            () => stderr,
          ).then((m) => ({ kind: 'done' as const, match: m })),
          awaitSentinel(
            () => stdout,
            /^STREAM_ERROR (\w+)$/m,
            45_000,
            child,
            () => stderr,
          ).then((m) => ({ kind: 'error' as const, match: m })),
        ]);

        const diag =
          `kind=${doneOrError.kind}; match=${JSON.stringify(doneOrError.match[0])}; ` +
          `stdout=${JSON.stringify(stdout.slice(-2000))}; ` +
          `stderr=${JSON.stringify(stderr.slice(-2000))}`;

        // KNOWN: model + network + orchestrator pipeline must produce
        // STREAM_DONE. STREAM_ERROR with auth_error → Defect A
        // regression (different probe). STREAM_ERROR otherwise →
        // network/rate-limit/model-side issue, not Defect B regression.
        expect(doneOrError.kind, diag).toBe('done');

        // KNOWN: STREAM_DONE preview is the orchestrator's structured
        // output. Match output_type ∈ {action, card, multi-choice-card}.
        // Per finding #84 resolution: model picked 'action' on the
        // dogfood run; we accept any of the three. text-passthrough
        // would mean the orchestrator system prompt didn't load —
        // i.e., readBuildDocConfig returned null — i.e., Defect B
        // regressed.
        const preview = doneOrError.match[1];
        expect(
          /output_type\s*"?\s*:\s*"(action|card|multi-choice-card)"/.test(preview),
          `preview must contain orchestrator-shaped output_type ∈ {action,card,multi-choice-card}; ` +
            `got=${JSON.stringify(preview.slice(0, 400))}; ${diag}`,
        ).toBe(true);

        // KNOWN-negative: text-passthrough is the regression signature.
        expect(
          /output_type\s*"?\s*:\s*"text-passthrough"/.test(preview),
          `Defect B regression — orchestrator prompt didn't load; preview=${JSON.stringify(preview.slice(0, 400))}; ${diag}`,
        ).toBe(false);

        child.stdin?.write('QUIT\n');
        await new Promise<void>((resolveP) => {
          const t = setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL');
            resolveP();
          }, 10_000);
          child.once('exit', () => {
            clearTimeout(t);
            resolveP();
          });
        });
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
      } finally {
        for (const dir of [onbDir, userDataDir]) {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch {
            /* best-effort */
          }
        }
      }
    },
    180_000,
  );
});
