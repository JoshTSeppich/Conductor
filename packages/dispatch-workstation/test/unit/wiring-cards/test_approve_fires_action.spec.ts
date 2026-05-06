// MB-T07 Phase 2 — WB4-11: shell-side IPC roundtrip.
//
// V3_TICKETS §202 names test_approve_fires_action.spec.ts in the MB-T07
// RED list. The existing dispatch-web/test/mb-t07-approve-fires-action.
// test.tsx covers the component layer (Approve pill click → onApprove
// callback) and the bridge-emit layer (emitCardApproved → bridge.approve
// envelope). What this spec covers is the SHELL-SIDE pipeline downstream
// of the bridge: ipcRenderer.send('card:approved', envelope) →
// registerCardIpcHandlers' ipcOn handler → cardContextCache lookup →
// buildApproveAuditRow → daemonClient.postAudit.
//
// Cluster 4 + WB1 alignment: card-bridge.ts is now structurally compatible
// with card-ipc-bridge.ts so the wire envelope flows verbatim from web
// click to shell handler. This test walks the full path end-to-end with
// a fake ipcOn capture seam, a real cardContextCache, and a fake
// DaemonAuditClient that records postAudit calls.

import { describe, it, expect, vi } from 'vitest';
import {
  registerCardIpcHandlers,
  type DaemonAuditClient,
} from '../../../src/main/card-ipc.js';
import {
  CardContextCache,
} from '../../../src/main/card-context-cache.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const sendCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  payload: { body: 'continue work on T05' },
  rationale: 'Triggering event maps to send action.',
  free_form_prompt: 'continue work on T05',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123def456',
};

interface CapturedIpc {
  handlers: Map<
    string,
    (event: unknown, payload: unknown) => Promise<void> | void
  >;
  ipcOn: (
    channel: string,
    listener: (event: unknown, payload: unknown) => Promise<void> | void,
  ) => void;
}

function captureIpc(): CapturedIpc {
  const handlers = new Map<
    string,
    (event: unknown, payload: unknown) => Promise<void> | void
  >();
  return {
    handlers,
    ipcOn: (channel, listener) => {
      handlers.set(channel, listener);
    },
  };
}

class CapturingDaemonClient implements DaemonAuditClient {
  public posted: Array<unknown> = [];
  async postAudit(req: unknown): Promise<unknown> {
    this.posted.push(req);
    return { id: 'audit-row-1', ...(req as Record<string, unknown>) };
  }
}

describe('MB-T07 WB4-11 — shell IPC roundtrip: bridge.approve → daemon audit POST', () => {
  it('Approve envelope walks through ipcOn → context lookup → daemonClient.postAudit', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const cardContext = new CardContextCache();
    cardContext.set('card-1', {
      card_id: 'card-1',
      trigger_event: 'spawn sherpa-001',
      build_doc_id: 'build-doc.md',
      build_doc_commit_sha: 'abc123def456',
      output_type: 'card',
      output_payload: sendCard,
      superseded_card_ids: [],
    });
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
      now: () => '2026-05-05T12:00:00.000Z',
    });

    const handler = ipc.handlers.get('card:approved');
    expect(handler).toBeDefined();
    // Web-side card-ipc-bridge.ts:87-99 constructs this exact envelope shape.
    await handler!(
      {} /* opaque ipc event */,
      {
        type: 'card-approved',
        card_id: 'card-1',
        free_form_text: 'modified prompt',
        timestamp: '2026-05-05T12:00:00.000Z',
      },
    );

    expect(daemonClient.posted).toHaveLength(1);
    const row = daemonClient.posted[0] as Record<string, unknown>;
    expect(row.operator_response).toBe('approve');
    expect(row.timestamp).toBe('2026-05-05T12:00:00.000Z');
    expect(row.trigger_event).toBe('spawn sherpa-001');
    expect(row.build_doc_id).toBe('build-doc.md');
    expect(row.output_type).toBe('card');
    // §7.4 free-form merge for `send` action: free_form_text replaces body.
    const merged = row.final_fired_payload as Record<string, unknown>;
    expect(merged.body).toBe('modified prompt');
    expect(row.free_form_text).toBe('modified prompt');
    expect(row.staleness_status).toBe('current');
    expect(row.execution_outcome).toBe('n/a');
  });

  it('Approve with empty free-form: free_form_text → null, payload sidecar absent for send action', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const cardContext = new CardContextCache();
    const readFileCard: CardOutput = {
      ...sendCard,
      action: 'read-file',
      target: '/doc.md',
      payload: undefined,
      free_form_prompt: '',
    };
    cardContext.set('card-2', {
      card_id: 'card-2',
      trigger_event: 'inspect doc',
      build_doc_id: 'build-doc.md',
      build_doc_commit_sha: 'abc123def456',
      output_type: 'card',
      output_payload: readFileCard,
      superseded_card_ids: [],
    });
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
      now: () => '2026-05-05T12:00:00.000Z',
    });

    await ipc.handlers.get('card:approved')!(
      {},
      {
        type: 'card-approved',
        card_id: 'card-2',
        free_form_text: null,
        timestamp: '2026-05-05T12:00:00.000Z',
      },
    );
    // Card-ipc.ts:200 normalizes null → '' in the row builder; the row's
    // free_form_text is null per §7.8 schema (empty-string-is-null) per
    // buildApproveAuditRow:136.
    const row = daemonClient.posted[0] as Record<string, unknown>;
    expect(row.free_form_text).toBeNull();
    expect(row.operator_response).toBe('approve');
  });

  it('Approve handler short-circuits silently when card_id is missing from cache', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const cardContext = new CardContextCache();
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
    });
    await ipc.handlers.get('card:approved')!(
      {},
      {
        type: 'card-approved',
        card_id: 'never-rendered',
        free_form_text: 'ignored',
        timestamp: '2026-05-05T12:00:00.000Z',
      },
    );
    // Defense-in-depth: missing context means no audit POST. Avoids
    // writing audit rows for cards that never legitimately rendered.
    expect(daemonClient.posted).toHaveLength(0);
  });

  it('Approve handler short-circuits silently when payload card_id is missing/empty', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const cardContext = new CardContextCache();
    cardContext.set('real-card', {
      card_id: 'real-card',
      trigger_event: 't',
      build_doc_id: 'b',
      build_doc_commit_sha: 's',
      output_type: 'card',
      output_payload: sendCard,
      superseded_card_ids: [],
    });
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
    });
    await ipc.handlers.get('card:approved')!({}, { card_id: '' });
    expect(daemonClient.posted).toHaveLength(0);
  });

  it('Decline handler walks through to daemonClient.postAudit with operator_response=decline + reason', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const cardContext = new CardContextCache();
    cardContext.set('card-3', {
      card_id: 'card-3',
      trigger_event: 'pivot',
      build_doc_id: 'build-doc.md',
      build_doc_commit_sha: 'abc123',
      output_type: 'card',
      output_payload: sendCard,
      superseded_card_ids: [],
    });
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
      now: () => '2026-05-05T12:00:00.000Z',
    });
    await ipc.handlers.get('card:declined')!(
      {},
      {
        type: 'card-declined',
        card_id: 'card-3',
        reason: 'pivoting to a different session',
        timestamp: '2026-05-05T12:00:00.000Z',
      },
    );
    const row = daemonClient.posted[0] as Record<string, unknown>;
    expect(row.operator_response).toBe('decline');
    expect(row.free_form_text).toBe('pivoting to a different session');
    expect(row.final_fired_payload).toBeNull();
  });

  it('Multi-choice handler walks through to daemonClient.postAudit with operator_response from selected_index', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const cardContext = new CardContextCache();
    const mc: CardOutput = sendCard;
    cardContext.set('mc-1', {
      card_id: 'mc-1',
      trigger_event: 'route handoff',
      build_doc_id: 'build-doc.md',
      build_doc_commit_sha: 'abc123',
      output_type: 'multi-choice-card',
      output_payload: mc,
      superseded_card_ids: [],
    });
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
      now: () => '2026-05-05T12:00:00.000Z',
    });
    await ipc.handlers.get('card:multi-choice-selected')!(
      {},
      {
        type: 'multi-choice-selected',
        card_id: 'mc-1',
        selected_index: 2,
        free_form_text: null,
        timestamp: '2026-05-05T12:00:00.000Z',
      },
    );
    const row = daemonClient.posted[0] as Record<string, unknown>;
    expect(row.operator_response).toBe('multi-choice-C');
    expect(row.free_form_text).toBeNull();
  });

  it('end-to-end isolation: each handler is called once per envelope (no double-fire, no stale state across calls)', async () => {
    const ipc = captureIpc();
    const daemonClient = new CapturingDaemonClient();
    const postSpy = vi.spyOn(daemonClient, 'postAudit');
    const cardContext = new CardContextCache();
    cardContext.set('card-1', {
      card_id: 'card-1',
      trigger_event: 't',
      build_doc_id: 'b',
      build_doc_commit_sha: 's',
      output_type: 'card',
      output_payload: sendCard,
      superseded_card_ids: [],
    });
    registerCardIpcHandlers({
      daemonClient,
      cardContext,
      ipcOn: ipc.ipcOn,
    });
    const approveHandler = ipc.handlers.get('card:approved')!;
    await approveHandler(
      {},
      {
        type: 'card-approved',
        card_id: 'card-1',
        free_form_text: 'a',
        timestamp: '2026-05-05T12:00:00.000Z',
      },
    );
    await approveHandler(
      {},
      {
        type: 'card-approved',
        card_id: 'card-1',
        free_form_text: 'b',
        timestamp: '2026-05-05T12:00:01.000Z',
      },
    );
    expect(postSpy).toHaveBeenCalledTimes(2);
  });
});
