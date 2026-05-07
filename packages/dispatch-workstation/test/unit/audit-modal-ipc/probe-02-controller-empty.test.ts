/**
 * MB-T13 WB7 — Probe 02: AuditModalIpcController returns [] on empty.
 *
 * Empty audit table → daemon returns { rows: [], total: 0 }; controller
 * passes through the empty result. Renderer should display an "empty"
 * placeholder (WB8 territory).
 */

import { describe, it, expect } from 'vitest';
import {
  AuditModalIpcController,
  type AuditModalFetchDeps,
} from '../../../src/main/audit-modal-ipc.js';

describe('MB-T13 WB7 — probe-02 — controller empty audit table', () => {
  it('returns ok:true with rows: [] and total: 0', async () => {
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async () => ({ rows: [], total: 0 }),
    };
    const controller = new AuditModalIpcController(deps);
    const result = await controller.handleFetch();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    }
  });
});
