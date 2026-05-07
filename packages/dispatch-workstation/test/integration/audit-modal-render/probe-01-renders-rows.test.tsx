// @vitest-environment happy-dom
/**
 * MB-T13 WB8 — Probe 01: AuditModal renders rows from a successful fetch.
 *
 * Mounts the AuditModal component with a mock bridge; verifies the
 * scrollable list renders one row per audit entry with the expected
 * summary fields (ts, session_name, action_type, status).
 *
 * happy-dom env per workstation vitest config (per-file pragma matches
 * console-mount precedent).
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import {
  AuditModal,
  type AuditModalBridge,
} from '../../../src/audit-modal/audit-modal.js';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '01890e0d-7c61-7a4a-8f4e-' + 'a'.repeat(12),
    ts: '2026-05-06T10:00:00.000Z',
    session_name: 'sherpa',
    action_type: 'send',
    intent_id: null,
    step: null,
    total_steps: null,
    approval_required: false,
    approval_status: 'not-required',
    payload_hash: 'a'.repeat(64),
    result_status: 'fired',
    operator_loop_state: 'manual',
    ...overrides,
  };
}

describe('MB-T13 WB8 — probe-01 — AuditModal renders rows', () => {
  it('renders one .audit-modal-row per fetched audit entry', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({
        ok: true,
        rows: [
          buildRow({ id: 'id-1', ts: '2026-05-06T11:00:00.000Z' }),
          buildRow({ id: 'id-2', ts: '2026-05-06T10:00:00.000Z' }),
          buildRow({ id: 'id-3', ts: '2026-05-06T09:00:00.000Z' }),
        ] as unknown as Array<Parameters<typeof AuditModal>[0]['bridge']>,
        total: 3,
      }),
    };

    render(createElement(AuditModal, { bridge, onClose: () => {} }));

    await waitFor(() => {
      const rows = screen.getAllByTestId('audit-modal-row');
      expect(rows).toHaveLength(3);
    });

    expect(screen.getByTestId('audit-modal-total').textContent).toBe('3 rows');
  });

  it('renders summary fields (ts, session_name, action_type) per row', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({
        ok: true,
        rows: [
          buildRow({
            id: 'sherpa-row',
            session_name: 'sherpa',
            action_type: 'send',
          }),
        ] as unknown as Array<Parameters<typeof AuditModal>[0]['bridge']>,
        total: 1,
      }),
    };

    render(createElement(AuditModal, { bridge, onClose: () => {} }));

    await waitFor(() => {
      const row = screen.getByTestId('audit-modal-row');
      expect(row).toBeTruthy();
      expect(row.textContent).toContain('sherpa');
      expect(row.textContent).toContain('send');
      expect(row.textContent).toContain('not-required');
      expect(row.textContent).toContain('fired');
    });
    expect(screen.getByTestId('audit-modal-total').textContent).toBe('1 row');
  });
});
