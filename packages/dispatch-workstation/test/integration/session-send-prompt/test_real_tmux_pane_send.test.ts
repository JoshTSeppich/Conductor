// MB-T09 WB4 — REFACTOR integration probes against real tmux.
//
// Drives SessionSendPromptIpcController end-to-end with the canonical
// dispatch-core/src/transport/tmux.ts helpers (load-buffer /
// paste-buffer / send-keys Enter / delete-buffer flow) against a
// real tmux pane running plain bash. No daemon, no claude — pure
// substrate verification of the IPC handler's behavior.
//
// Two probes per Phase 2 brief WB4:
//   P7 — spawn smoke tmux session → controller.handleSendPrompt with
//        "echo hello" → pane buffer contains "hello" within 500ms.
//        Closes CONDUCTOR_V3_RESCOPE.md §4 line 193 acceptance gate.
//
//   P8 — same controller fired with envelope-wrapped prompt; pane
//        buffer contains BOTH the operator-visible comment line AND
//        the executed-prompt output.
//
// Auto-skip-with-MANUAL pattern (operator §7.5): preconditions
// checked at probe-start; missing tmux / non-darwin → ctx.skip()
// with explicit reason. Vitest source-imports the controller via
// the TS transform (no dist build needed); the controller class
// itself does not invoke `ipcMain.handle` at module-load (only
// `registerSessionSendPromptIpcHandlers` does, which we don't call
// here), so 'electron' import resolves to a no-op binding under
// Vitest's node environment without requiring vi.mock('electron').

import { describe, expect, it } from 'vitest';
import { execFile, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  SessionSendPromptIpcController,
  defaultSessionSendPromptDeps,
} from '../../../src/main/session-send-prompt-ipc.js';
import type { SendPromptEnvelope } from 'dispatch-core/src/v3/schema.js';

const execFileP = promisify(execFile);
const TMUX_BIN = 'tmux';

interface PreconditionResult {
  ok: boolean;
  reason: string;
}

function checkPreconditions(): PreconditionResult {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    return {
      ok: false,
      reason: `unsupported platform ${process.platform}; tmux only runs on darwin/linux`,
    };
  }
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    return { ok: false, reason: 'tmux not on PATH; install tmux for KNOWN evidence' };
  }
  return { ok: true, reason: 'preconditions met' };
}

/** Make a unique session name to avoid colliding with operator's own tmux state. */
function uniqueSessionName(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a detached bash tmux session; throws on failure. */
async function createSmokeSession(name: string): Promise<void> {
  await execFileP(TMUX_BIN, ['new-session', '-d', '-s', name, 'bash']);
}

/** Best-effort cleanup; never throws. */
async function killSession(name: string): Promise<void> {
  try {
    await execFileP(TMUX_BIN, ['kill-session', '-t', name]);
  } catch {
    /* session may already be gone */
  }
}

/** capture-pane with -p (print) flag. Returns the pane buffer text. */
async function capturePane(name: string): Promise<string> {
  const { stdout } = await execFileP(TMUX_BIN, [
    'capture-pane',
    '-t',
    name,
    '-p',
  ]);
  return stdout;
}

/**
 * Poll capturePane until predicate passes OR timeout expires. Returns
 * the final buffer (regardless of predicate outcome) so the caller can
 * assert with full buffer in error message.
 */
async function pollPaneUntil(
  name: string,
  predicate: (buf: string) => boolean,
  timeoutMs: number,
  intervalMs: number = 50,
): Promise<string> {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    last = await capturePane(name);
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

const itPlatform =
  process.platform === 'darwin' || process.platform === 'linux' ? it : it.skip;

describe('MB-T09 WB4 — session-send-prompt-ipc against real tmux', () => {
  itPlatform(
    'P7 — controller.handleSendPrompt sends "echo hello" to pane; "hello" appears within 500ms',
    async (ctx) => {
      const pre = checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      const sessionName = uniqueSessionName('mbt09-p7');
      const controller = new SessionSendPromptIpcController(
        defaultSessionSendPromptDeps(),
      );

      try {
        await createSmokeSession(sessionName);

        const reply = await controller.handleSendPrompt({
          sessionName,
          prompt: 'echo hello',
        });

        // Reply is { ok: true } — handler accepted the payload, hasSession
        // confirmed pane alive, sendKeys returned without throwing.
        expect(reply).toEqual({ ok: true });

        // Pane content arrives via the bash subprocess writing to its PTY.
        // 500ms is the contract from CONDUCTOR_V3_RESCOPE.md §4 line 193.
        const buf = await pollPaneUntil(
          sessionName,
          (b) => b.includes('hello'),
          500,
        );
        expect(
          buf,
          `expected pane buffer to contain "hello" within 500ms; ` +
            `got buffer:\n---\n${buf}\n---`,
        ).toContain('hello');
      } finally {
        await killSession(sessionName);
      }
    },
    10_000,
  );

  itPlatform(
    'P8 — envelope-wrapped prompt: pane shows both operator comment line AND executed prompt output',
    async (ctx) => {
      const pre = checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      const sessionName = uniqueSessionName('mbt09-p8');
      const controller = new SessionSendPromptIpcController(
        defaultSessionSendPromptDeps(),
      );

      const envelope: SendPromptEnvelope = {
        envelope_version: 1,
        intent_id: '123e4567-e89b-12d3-a456-426614174000',
        step: 2,
        total_steps: 4,
        intent_summary: 'wb4 envelope smoke',
      };
      // Prompt text chosen so the executed output is unambiguous and
      // distinct from the comment line content (no overlap with
      // "orchestrator", "intent_id", etc.).
      const prompt = 'echo from-envelope';

      try {
        await createSmokeSession(sessionName);

        const reply = await controller.handleSendPrompt({
          sessionName,
          prompt,
          envelope,
        });
        expect(reply).toEqual({ ok: true });

        // Three observable signals:
        //   1. Comment line text in pane (proves serializer prepended)
        //   2. Prompt text in pane (proves prompt content delivered)
        //   3. Output of `echo from-envelope` (proves bash treated
        //      comment line as comment and executed line 2)
        const buf = await pollPaneUntil(
          sessionName,
          (b) =>
            b.includes('# orchestrator: intent_id=') &&
            b.includes('echo from-envelope') &&
            // The output line. The string "from-envelope" appears in
            // the prompt text too, so we anchor on the post-execution
            // bash prompt by requiring at least two occurrences of
            // the output token.
            (b.match(/from-envelope/g)?.length ?? 0) >= 2,
          1_000,
        );

        expect(
          buf,
          `expected pane buffer to contain envelope comment line; ` +
            `got buffer:\n---\n${buf}\n---`,
        ).toContain('# orchestrator: intent_id=123e4567-e89b-12d3-a456-426614174000');
        expect(
          buf,
          `expected pane buffer to contain prompt text "echo from-envelope"; ` +
            `got buffer:\n---\n${buf}\n---`,
        ).toContain('echo from-envelope');
        // Output appears separately from the typed prompt. Two-or-more
        // occurrences of "from-envelope" confirm both the typed-input
        // line AND the output line are present.
        const occurrences = buf.match(/from-envelope/g)?.length ?? 0;
        expect(
          occurrences,
          `expected at least 2 occurrences of "from-envelope" (typed input + ` +
            `executed output); got ${occurrences} in buffer:\n---\n${buf}\n---`,
        ).toBeGreaterThanOrEqual(2);
      } finally {
        await killSession(sessionName);
      }
    },
    10_000,
  );
});
