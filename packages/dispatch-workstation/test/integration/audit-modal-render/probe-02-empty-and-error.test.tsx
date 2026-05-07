// @vitest-environment happy-dom
/**
 * MB-T13 WB8 — Probe 02: AuditModal renders empty + error states.
 *
 * Empty audit table → "No orchestrator actions recorded yet."
 * fetch failure → "Failed to load audit log: <message>"
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import {
  AuditModal,
  type AuditModalBridge,
} from '../../../src/audit-modal/audit-modal.js';

describe('MB-T13 WB8 — probe-02 — AuditModal empty + error states', () => {
  it('empty audit table → renders empty placeholder', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({ ok: true, rows: [], total: 0 }),
    };
    render(createElement(AuditModal, { bridge, onClose: () => {} }));
    await waitFor(() => {
      expect(screen.getByTestId('audit-modal-empty')).toBeTruthy();
    });
    expect(screen.getByTestId('audit-modal-empty').textContent).toContain(
      'No orchestrator actions recorded yet',
    );
  });

  it('daemon-unreachable → renders error with the daemon message', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({
        ok: false,
        error: { type: 'daemon-unreachable', message: 'connection refused' },
      }),
    };
    render(createElement(AuditModal, { bridge, onClose: () => {} }));
    await waitFor(() => {
      expect(screen.getByTestId('audit-modal-error')).toBeTruthy();
    });
    expect(screen.getByTestId('audit-modal-error').textContent).toContain(
      'connection refused',
    );
  });

  it('parse-failure → renders error with the parse message', async () => {
    const bridge: AuditModalBridge = {
      fetchAuditModal: async () => ({
        ok: false,
        error: { type: 'parse-failure', message: 'unexpected response shape' },
      }),
    };
    render(createElement(AuditModal, { bridge, onClose: () => {} }));
    await waitFor(() => {
      expect(screen.getByTestId('audit-modal-error')).toBeTruthy();
    });
    expect(screen.getByTestId('audit-modal-error').textContent).toContain(
      'unexpected response shape',
    );
  });
});
