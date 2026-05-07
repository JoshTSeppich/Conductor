// MB-T13 WB8: AuditModal React component.
//
// Per CONDUCTOR_V3_RESCOPE.md §3.8 + Phase 2 brief WB8: minimal modal
// renderer for the "Show recent orchestrator actions" menu item. Per
// Q-MBT13-9=a (LIMIT 100 ORDER BY ts DESC at v3.0), the modal renders
// up to 100 rows in a single scrollable list — rich filtering /
// pagination deferred to v3.1 followup MB-F-T13-AUDIT-MODAL-FILTERS.
//
// Each row shows ts, session_name, action_type, approval_status, and
// result_status. Click row → expand to show full row JSON (intent_id,
// step, total_steps, payload_hash, etc.). Close button + ESC key
// dismiss.
//
// Bridge dep-injected via prop so tests can render with a mock bridge
// (no Electron preload needed at unit/integration scope). Mount entry
// (mount.tsx) reads window.workstationBridge.fetchAuditModal at boot.

import { useEffect, useState, type ReactElement } from 'react';

interface AuditRow {
  id: string;
  ts: string;
  session_name: string;
  action_type: string;
  intent_id: string | null;
  step: number | null;
  total_steps: number | null;
  approval_required: boolean;
  approval_status: string;
  payload_hash: string;
  result_status: string;
  operator_loop_state: string;
}

type FetchResult =
  | { ok: true; rows: AuditRow[]; total: number }
  | {
      ok: false;
      error: { type: 'daemon-unreachable' | 'parse-failure'; message: string };
    };

export interface AuditModalBridge {
  fetchAuditModal: () => Promise<FetchResult>;
}

export interface AuditModalProps {
  bridge: AuditModalBridge;
  /**
   * Optional close callback. When omitted, defaults to window.close()
   * (production wiring); tests inject a no-op or recording fn.
   */
  onClose?: () => void;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'success'; rows: AuditRow[]; total: number }
  | { kind: 'error'; message: string };

export function AuditModal(props: AuditModalProps): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const onClose = props.onClose ?? (() => window.close());

  // Initial fetch on mount.
  useEffect(() => {
    let cancelled = false;
    void props.bridge.fetchAuditModal().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ kind: 'success', rows: result.rows, total: result.total });
      } else {
        setState({ kind: 'error', message: result.error.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [props.bridge]);

  // ESC dismisses.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function toggleExpanded(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="audit-modal" data-testid="audit-modal-root">
      <div className="audit-modal-header">
        <span className="audit-modal-title">Recent orchestrator actions</span>
        <span className="audit-modal-total" data-testid="audit-modal-total">
          {state.kind === 'success' ? `${state.total} row${state.total === 1 ? '' : 's'}` : ''}
        </span>
        <button
          className="audit-modal-close"
          onClick={onClose}
          data-testid="audit-modal-close"
        >
          Close
        </button>
      </div>
      <div className="audit-modal-list" data-testid="audit-modal-list">
        {state.kind === 'loading' ? (
          <div className="audit-modal-loading" data-testid="audit-modal-loading">
            Loading…
          </div>
        ) : state.kind === 'error' ? (
          <div className="audit-modal-error" data-testid="audit-modal-error">
            Failed to load audit log: {state.message}
          </div>
        ) : state.rows.length === 0 ? (
          <div className="audit-modal-empty" data-testid="audit-modal-empty">
            No orchestrator actions recorded yet.
          </div>
        ) : (
          state.rows.map((row) => {
            const isExpanded = expandedIds.has(row.id);
            return (
              <div
                key={row.id}
                className="audit-modal-row"
                data-testid="audit-modal-row"
                data-row-id={row.id}
                onClick={() => toggleExpanded(row.id)}
              >
                <div className="audit-modal-row-summary">
                  <span className="audit-modal-row-ts">{row.ts}</span>
                  <span className="audit-modal-row-session">
                    {row.session_name}
                  </span>
                  <span className="audit-modal-row-action">
                    {row.action_type}
                  </span>
                  <span
                    className={`audit-modal-row-status ${row.result_status}`}
                  >
                    {row.approval_status}/{row.result_status}
                  </span>
                </div>
                {isExpanded && (
                  <div
                    className="audit-modal-row-expanded"
                    data-testid="audit-modal-row-expanded"
                  >
                    {JSON.stringify(row, null, 2)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
