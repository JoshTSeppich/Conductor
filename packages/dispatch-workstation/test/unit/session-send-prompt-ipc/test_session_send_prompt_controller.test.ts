// MB-T09 WB2 — RED probes for SessionSendPromptIpcController.
//
// The controller is the unit-test seam for the new
// `workstation:session-send-prompt` IPC channel. It mirrors the
// SpawnIpcController / ConsoleIpcController patterns from
// packages/dispatch-workstation/src/main/{spawn-ipc,console-ipc}.ts:
// inject a deps interface (here: { hasSession, sendKeys }) so tests
// don't need real tmux + electron to exercise handler logic.
//
// Six probes per Phase 2 brief WB2:
//   P1 — well-formed payload, calls injected tmux client correctly
//        and returns { ok: true }.
//   P2 — schema-invalid payload surfaces a typed WorkstationError
//        (SchemaValidationError) with ok:false; deps not called.
//   P3 — unknown sessionName (hasSession returns false) surfaces
//        SessionNotFoundError; sendKeys not called.
//   P4 — envelope path: handler prepends the operator-visible
//        comment line per CONDUCTOR_V3_RESCOPE.md §3.4 lines 107-111
//        before invoking sendKeys.
//   P5 — no-envelope path: handler sends prompt verbatim (no
//        comment-line prepend, no transformation).
//   P6 — sendKeys rejection surfaces a typed TmuxSendError reply
//        (added to WorkstationErrorSchema in WB1 commit 7322f90).
//
// RED state is module-load failure: the SUT module
// `src/main/session-send-prompt-ipc.ts` does not exist until WB3
// GREEN ships it, so every test in this file fails with
// `Cannot find module '../../../src/main/session-send-prompt-ipc.js'`.
// That is the intended RED signature. WB3 GREEN builds the controller
// + envelope serializer to flip all six to green.

import { describe, expect, it, vi } from 'vitest';
import type {
  WorkstationSessionSendPromptReply,
  SendPromptEnvelope,
} from 'dispatch-core/src/v3/schema.js';
import {
  SessionSendPromptIpcController,
  type SessionSendPromptDeps,
} from '../../../src/main/session-send-prompt-ipc.js';

// ──────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────

function happyDeps(): SessionSendPromptDeps & {
  hasSession: ReturnType<typeof vi.fn>;
  sendKeys: ReturnType<typeof vi.fn>;
} {
  return {
    hasSession: vi.fn().mockResolvedValue(true),
    sendKeys: vi.fn().mockResolvedValue(undefined),
  };
}

const ENVELOPE_FIXTURE: SendPromptEnvelope = {
  envelope_version: 1,
  intent_id: '123e4567-e89b-12d3-a456-426614174000',
  step: 2,
  total_steps: 4,
  intent_summary: 'refactor auth middleware',
};

// Expected serialized envelope per CONDUCTOR_V3_RESCOPE.md §3.4:
//   # orchestrator: intent_id=<uuid> step=<n>/<total> — <summary>
//   <prompt>
const ENVELOPE_FIXTURE_PROMPT = 'do the thing';
const ENVELOPE_FIXTURE_EXPECTED_SERIALIZED =
  '# orchestrator: intent_id=123e4567-e89b-12d3-a456-426614174000 step=2/4 — refactor auth middleware\ndo the thing';

// Narrowing helpers — the Reply is a discriminated union on `ok`.
function assertOk(reply: WorkstationSessionSendPromptReply): asserts reply is { ok: true } {
  if (reply.ok !== true) {
    throw new Error(`expected ok:true reply, got ${JSON.stringify(reply)}`);
  }
}
function assertErr(
  reply: WorkstationSessionSendPromptReply,
): asserts reply is { ok: false; error: Extract<WorkstationSessionSendPromptReply, { ok: false }>['error'] } {
  if (reply.ok !== false) {
    throw new Error(`expected ok:false reply, got ${JSON.stringify(reply)}`);
  }
}

// ──────────────────────────────────────────────────────────────────
// Probes
// ──────────────────────────────────────────────────────────────────

describe('SessionSendPromptIpcController.handleSendPrompt', () => {
  it('P1 — well-formed payload calls injected tmux client and returns ok:true', async () => {
    const deps = happyDeps();
    const controller = new SessionSendPromptIpcController(deps);

    const reply = await controller.handleSendPrompt({
      sessionName: 'sess-alpha',
      prompt: 'echo hello',
    });

    assertOk(reply);
    expect(deps.hasSession).toHaveBeenCalledTimes(1);
    expect(deps.hasSession).toHaveBeenCalledWith('sess-alpha');
    expect(deps.sendKeys).toHaveBeenCalledTimes(1);
    expect(deps.sendKeys).toHaveBeenCalledWith('sess-alpha', 'echo hello');
  });

  it('P2 — schema-invalid payload surfaces SchemaValidationError; deps not called', async () => {
    const deps = happyDeps();
    const controller = new SessionSendPromptIpcController(deps);

    // Missing required `sessionName` — Zod safeParse should reject.
    const reply = await controller.handleSendPrompt({
      prompt: 'orphaned',
    } as unknown);

    assertErr(reply);
    expect(reply.error.error_type).toBe('SchemaValidationError');
    expect(deps.hasSession).not.toHaveBeenCalled();
    expect(deps.sendKeys).not.toHaveBeenCalled();
  });

  it('P3 — unknown sessionName surfaces SessionNotFoundError; sendKeys not called', async () => {
    const deps: SessionSendPromptDeps & {
      hasSession: ReturnType<typeof vi.fn>;
      sendKeys: ReturnType<typeof vi.fn>;
    } = {
      hasSession: vi.fn().mockResolvedValue(false),
      sendKeys: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new SessionSendPromptIpcController(deps);

    const reply = await controller.handleSendPrompt({
      sessionName: 'ghost-session',
      prompt: 'never sent',
    });

    assertErr(reply);
    expect(reply.error.error_type).toBe('SessionNotFoundError');
    if (reply.error.error_type === 'SessionNotFoundError') {
      expect(reply.error.session_id).toBe('ghost-session');
    }
    expect(deps.hasSession).toHaveBeenCalledWith('ghost-session');
    expect(deps.sendKeys).not.toHaveBeenCalled();
  });

  it('P4 — envelope path prepends operator-visible comment line before sendKeys', async () => {
    const deps = happyDeps();
    const controller = new SessionSendPromptIpcController(deps);

    const reply = await controller.handleSendPrompt({
      sessionName: 'sess-beta',
      prompt: ENVELOPE_FIXTURE_PROMPT,
      envelope: ENVELOPE_FIXTURE,
    });

    assertOk(reply);
    expect(deps.sendKeys).toHaveBeenCalledTimes(1);
    expect(deps.sendKeys).toHaveBeenCalledWith(
      'sess-beta',
      ENVELOPE_FIXTURE_EXPECTED_SERIALIZED,
    );
  });

  it('P5 — no-envelope path sends prompt verbatim (no transformation)', async () => {
    const deps = happyDeps();
    const controller = new SessionSendPromptIpcController(deps);

    const verbatim = 'multi\nline\nprompt with $vars and `backticks`';

    const reply = await controller.handleSendPrompt({
      sessionName: 'sess-gamma',
      prompt: verbatim,
    });

    assertOk(reply);
    expect(deps.sendKeys).toHaveBeenCalledWith('sess-gamma', verbatim);
  });

  it('P6 — sendKeys rejection surfaces typed TmuxSendError reply', async () => {
    const tmuxErr = new Error('tmux: pane closed unexpectedly');
    const deps: SessionSendPromptDeps & {
      hasSession: ReturnType<typeof vi.fn>;
      sendKeys: ReturnType<typeof vi.fn>;
    } = {
      hasSession: vi.fn().mockResolvedValue(true),
      sendKeys: vi.fn().mockRejectedValue(tmuxErr),
    };
    const controller = new SessionSendPromptIpcController(deps);

    const reply = await controller.handleSendPrompt({
      sessionName: 'sess-delta',
      prompt: 'will fail',
    });

    assertErr(reply);
    expect(reply.error.error_type).toBe('TmuxSendError');
    if (reply.error.error_type === 'TmuxSendError') {
      expect(reply.error.target).toBe('sess-delta');
      expect(reply.error.reason).toBe('tmux: pane closed unexpectedly');
    }
    expect(deps.sendKeys).toHaveBeenCalledTimes(1);
  });
});
