// MB-T-MVP-W3-CONDUCTOR-CHAT WB3 — Composer.
//
// Composer surface for the conductor-chat region (design
// conductor-chat.jsx:124-165 + Conductor V_MVP.html:635-732). Owns the
// FROZEN testids from docs/coordination/w3-testid-contract-2026-05-17.md
// §COMPOSER: conductor-composer-paperclip / -textarea / -send /
// -buildmd-chip / -dispatch-next.
//
// BuildMdChip is rendered as a PLACEHOLDER stub here per cross-session
// arbitration: gen-7 W3 owns src/conductor-chat/build-md-chip.tsx body
// (shipped 9357fd8). This composer renders a stub <div> with the chip
// testid + className "conductor-composer-buildmd-chip" + filename text;
// gen-7's mount integration (their WB5) later swaps the body in via the
// integration wiring. Keeping the testid surface here means the visible
// chip lights up before the body swap.

import * as React from 'react';

export interface ComposerProps {
  attached?: { name: string; steps: number } | null;
  queue?: ReadonlyArray<unknown>;
  paused?: boolean;
  onSend: (text: string) => void;
  onAttach: () => void;
  onDetach?: () => void;
  onDispatchNext?: () => void;
}

export function Composer(props: ComposerProps): React.ReactElement {
  const { attached, queue, paused, onSend, onAttach, onDispatchNext } = props;
  const [draft, setDraft] = React.useState('');

  const send = (): void => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  const showDispatchNext = Boolean(
    attached && queue && queue.length > 0 && !paused,
  );

  return (
    <div className="conductor-composer">
      {attached && (
        <div className="composer-attachments">
          <div
            data-testid="conductor-composer-buildmd-chip"
            className="conductor-composer-buildmd-chip buildmd-chip"
          >
            {attached.name}
          </div>
          {showDispatchNext && (
            <button
              data-testid="conductor-composer-dispatch-next"
              className="dispatch-next-btn"
              onClick={onDispatchNext}
              type="button"
            >
              dispatch next →
            </button>
          )}
        </div>
      )}

      <div className="composer-row">
        <button
          data-testid="conductor-composer-paperclip"
          className="composer-icon-btn"
          onClick={onAttach}
          title="Attach build.md"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M11 3l4 4-7 7a3 3 0 01-4.24-4.24L9 5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <textarea
          data-testid="conductor-composer-textarea"
          className="composer-input"
          placeholder={
            attached
              ? 'Add guidance, or hit ↵ to start dispatching…'
              : 'Drop a build.md or ask the Conductor to do something…'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
        />

        <button
          data-testid="conductor-composer-send"
          className="composer-send"
          onClick={send}
          disabled={!draft.trim()}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="composer-hint">
        <kbd>↵</kbd> send · <kbd>⇧↵</kbd> newline · build.md is parsed into ordered steps and piped one at a time to the Orchestrator
      </div>
    </div>
  );
}
