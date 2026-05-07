/**
 * MB-T13 WB7 — Probe 01: AuditModalIpcController returns rows on success.
 *
 * Dep-injected fetchSwarmAudit returns a valid response shape;
 * controller validates via OrchestratorSwarmAuditQueryResponseSchema
 * and returns ok:true with the rows + total.
 */

import { describe, it, expect } from 'vitest';
import {
  AuditModalIpcController,
  type AuditModalFetchDeps,
} from '../../../src/main/audit-modal-ipc.js';

const sampleRow = {
  id: '01890e0d-7c61-7a4a-8f4e-aaaaaaaaaaaa',
  ts: '2026-05-06T10:00:00.000Z',
  session_name: 'sherpa',
  action_type: 'send' as const,
  intent_id: null,
  step: null,
  total_steps: null,
  approval_required: false,
  approval_status: 'not-required' as const,
  payload_hash: 'a'.repeat(64),
  result_status: 'fired' as const,
  operator_loop_state: 'manual' as const,
};

describe('MB-T13 WB7 — probe-01 — controller success path', () => {
  it('returns ok:true with rows + total when fetch succeeds', async () => {
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async () => ({
        rows: [sampleRow, { ...sampleRow, ts: '2026-05-06T11:00:00.000Z' }],
        total: 2,
      }),
    };
    const controller = new AuditModalIpcController(deps);
    const result = await controller.handleFetch();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.total).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].session_name).toBe('sherpa');
    }
  });

  it('preserves all 12 fields from the daemon response', async () => {
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async () => ({ rows: [sampleRow], total: 1 }),
    };
    const controller = new AuditModalIpcController(deps);
    const result = await controller.handleFetch();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const r = result.rows[0];
      expect(r.id).toBe(sampleRow.id);
      expect(r.ts).toBe(sampleRow.ts);
      expect(r.session_name).toBe(sampleRow.session_name);
      expect(r.action_type).toBe(sampleRow.action_type);
      expect(r.intent_id).toBeNull();
      expect(r.step).toBeNull();
      expect(r.total_steps).toBeNull();
      expect(r.approval_required).toBe(false);
      expect(r.approval_status).toBe(sampleRow.approval_status);
      expect(r.payload_hash).toBe(sampleRow.payload_hash);
      expect(r.result_status).toBe(sampleRow.result_status);
      expect(r.operator_loop_state).toBe(sampleRow.operator_loop_state);
    }
  });
});
