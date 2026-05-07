/**
 * MB-T13 WB7 — Probe 03: AuditModalIpcController surfaces daemon failures.
 *
 * fetchSwarmAudit dep rejects (network error / 401 / 500 / etc.);
 * controller catches and returns ok:false with type 'daemon-unreachable'
 * + a message. Per design rationale in audit-modal-ipc.ts: errors
 * surface to the operator (NOT swallowed) because the modal is a
 * synchronous user-facing UI request.
 *
 * Result shape uses a LOCAL discriminated union (NOT WorkstationError —
 * see audit-modal-ipc.ts header for why §8 is not extended).
 */

import { describe, it, expect } from 'vitest';
import {
  AuditModalIpcController,
  type AuditModalFetchDeps,
} from '../../../src/main/audit-modal-ipc.js';

describe('MB-T13 WB7 — probe-03 — controller daemon-unreachable path', () => {
  it('returns ok:false with type: daemon-unreachable when fetch throws', async () => {
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async () => {
        throw new Error('connection refused');
      },
    };
    const controller = new AuditModalIpcController(deps);
    const result = await controller.handleFetch();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('daemon-unreachable');
      expect(result.error.message).toBe('connection refused');
    }
  });

  it('handles non-Error throws (string, undefined) gracefully', async () => {
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'token expired';
      },
    };
    const controller = new AuditModalIpcController(deps);
    const result = await controller.handleFetch();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('daemon-unreachable');
      expect(result.error.message).toBe('token expired');
    }
  });

  it('returns ok:false with type: parse-failure on malformed daemon response', async () => {
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async () => ({
        // missing `rows` and `total` — should fail Zod validation
        garbage: true,
      }),
    };
    const controller = new AuditModalIpcController(deps);
    const result = await controller.handleFetch();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('parse-failure');
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });
});
