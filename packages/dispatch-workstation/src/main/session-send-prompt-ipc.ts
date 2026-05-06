// MB-T09: workstation:session-send-prompt IPC handler + dep-injected
// controller seam.
//
// Receives a payload from the renderer (orchestrator-fired in MB-T11,
// tile footer in MB-T12), validates it against the v3 schema, and
// routes the prompt text into a tmux session via the canonical
// sendKeys helper at dispatch-core/src/transport/tmux.ts (which uses
// load-buffer / paste-buffer / send-keys Enter / delete-buffer per
// spike-01 evidence — bare `send-keys -t … <text> Enter` is broken
// for any text containing tmux key names).
//
// Pattern mirrors ConsoleIpcController (request/reply via
// ipc.handle): the renderer awaits a typed Reply rather than a
// fire-and-forget + listener. SessionSendPromptDeps is the unit-test
// seam; defaultSessionSendPromptDeps wires production tmux helpers.

import { ipcMain } from 'electron';
import {
  WorkstationSessionSendPromptRequestSchema,
  type WorkstationSessionSendPromptReply,
} from 'dispatch-core/src/v3/schema.js';
import { serializeEnvelope } from 'dispatch-core/src/v3/envelope-serializer.js';
import {
  hasSession as coreHasSession,
  sendKeys as coreSendKeys,
} from 'dispatch-core/src/transport/tmux.js';

export interface SessionSendPromptDeps {
  /** Returns true iff a tmux session/pane with this name exists. */
  hasSession: (sessionName: string) => Promise<boolean>;
  /** Sends `text` to the named tmux target and submits with Enter. */
  sendKeys: (target: string, text: string) => Promise<void>;
}

export class SessionSendPromptIpcController {
  constructor(private readonly deps: SessionSendPromptDeps) {}

  async handleSendPrompt(
    payload: unknown,
  ): Promise<WorkstationSessionSendPromptReply> {
    const parsed = WorkstationSessionSendPromptRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        ok: false,
        error: {
          error_type: 'SchemaValidationError',
          schema: 'WorkstationSessionSendPromptRequestSchema',
          field_path: firstIssue?.path.join('.') ?? '',
          issue: firstIssue?.message ?? parsed.error.message,
          build_doc_commit_sha: null,
        },
      };
    }
    const { sessionName, prompt, envelope } = parsed.data;

    const alive = await this.deps.hasSession(sessionName);
    if (!alive) {
      return {
        ok: false,
        error: {
          error_type: 'SessionNotFoundError',
          session_id: sessionName,
        },
      };
    }

    const text = envelope ? serializeEnvelope(envelope, prompt) : prompt;

    try {
      await this.deps.sendKeys(sessionName, text);
      return { ok: true };
    } catch (e) {
      const reason =
        e instanceof Error ? e.message : typeof e === 'string' ? e : String(e);
      return {
        ok: false,
        error: {
          error_type: 'TmuxSendError',
          target: sessionName,
          reason: reason.length > 0 ? reason : 'unknown sendKeys failure',
        },
      };
    }
  }
}

export function defaultSessionSendPromptDeps(): SessionSendPromptDeps {
  return {
    hasSession: coreHasSession,
    sendKeys: coreSendKeys,
  };
}

export interface RegisterSessionSendPromptIpcOpts {
  controller?: SessionSendPromptIpcController;
}

export function registerSessionSendPromptIpcHandlers(
  opts: RegisterSessionSendPromptIpcOpts = {},
): void {
  const controller =
    opts.controller ??
    new SessionSendPromptIpcController(defaultSessionSendPromptDeps());

  ipcMain.handle('workstation:session-send-prompt', async (_event, payload) => {
    return controller.handleSendPrompt(payload);
  });
}
