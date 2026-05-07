// @vitest-environment happy-dom
/**
 * MB-T13 WB8 — Probe 03: AuditModal row expand + close interactions.
 *
 * Click row → JSON detail expands; click again → collapses.
 * Click Close button → onClose callback fires.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import {
  AuditModal,
  type AuditModalBridge,
} from '../../../src/audit-modal/audit-modal.js';

const sampleRow = {
  id: 'expandable-row-id',
  ts: '2026-05-06T10:00:00.000Z',
  session_name: 'sherpa',
  action_type: 'send',
  intent_id: '01890e0d-7c61-7a4a-8f4e-' + 'a'.repeat(12),
  step: 2,
  total_steps: 4,
  approval_required: true,
  approval_status: 'approved',
  payload_hash: 'b'.repeat(64),
  result_status: 'fired',
  operator_loop_state: 'autopilot',
};

describe('MB-T13 WB8 — probe-03 — AuditModal row expand + close', () => {
  it('clicking a row expands JSON detail; clicking again collapses', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({
        ok: true,
        rows: [sampleRow] as unknown as Array<
          Parameters<typeof AuditModal>[0]['bridge']
        >,
        total: 1,
      }),
    };
    render(createElement(AuditModal, { bridge, onClose: () => {} }));

    const row = await waitFor(() => screen.getByTestId('audit-modal-row'));
    expect(screen.queryByTestId('audit-modal-row-expanded')).toBeNull();

    fireEvent.click(row);
    const expanded = await waitFor(() =>
      screen.getByTestId('audit-modal-row-expanded'),
    );
    expect(expanded.textContent).toContain('intent_id');
    expect(expanded.textContent).toContain('payload_hash');
    expect(expanded.textContent).toContain('autopilot');

    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.queryByTestId('audit-modal-row-expanded')).toBeNull();
    });
  });

  it('Close button fires onClose callback', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({ ok: true, rows: [], total: 0 }),
    };
    let closed = false;
    const onClose = (): void => {
      closed = true;
    };
    render(createElement(AuditModal, { bridge, onClose }));

    const closeButton = await waitFor(() =>
      screen.getByTestId('audit-modal-close'),
    );
    fireEvent.click(closeButton);
    expect(closed).toBe(true);
  });

  it('ESC key fires onClose callback', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({ ok: true, rows: [], total: 0 }),
    };
    let closed = false;
    const onClose = (): void => {
      closed = true;
    };
    render(createElement(AuditModal, { bridge, onClose }));

    await waitFor(() => screen.getByTestId('audit-modal-close'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBe(true);
  });
});
