// MB-T-MVP-W3-CONDUCTOR-CHAT WB4 — Header.
//
// Header chrome (left: brand + filename + done/total pill;
// right: pause/resume + cancel) for the conductor-chat region
// (design conductor-chat.jsx:82-109 + Conductor V_MVP.html:485-528).
// Owns the FROZEN testids from
// docs/coordination/w3-testid-contract-2026-05-17.md §HEADER:
//   conductor-header-brand / -filename-pill / -pause / -resume / -cancel.
//
// Returns a fragment (no outer wrapper div) so it composes cleanly into
// the conductor-chat-header slot via gen-7 W3's render-prop pattern
// (conductor-chat.tsx ConductorChatProps.renderHeader). The slot's
// `.conductor-header` outer div already provides the design CSS flex
// layout (justify-content: space-between for title vs controls).
//
// Pause/resume is a single button per design with state-dependent label
// AND state-dependent testid per the contract: `-pause` when !paused,
// `-resume` when paused. The two testids are mutually exclusive.

import * as React from 'react';

export interface HeaderProps {
  attached?: { name: string; steps: number } | null;
  queue?: ReadonlyArray<unknown>;
  total?: number;
  paused?: boolean;
  onTogglePause?: () => void;
  onCancel?: () => void;
}

export function Header(props: HeaderProps): React.ReactElement {
  const {
    attached,
    queue = [],
    total = 0,
    paused = false,
    onTogglePause,
    onCancel,
  } = props;
  const done = total - queue.length;

  return (
    <>
      <div className="conductor-title">
        <span className="conductor-brand" data-testid="conductor-header-brand">
          <span className="conductor-mark">C</span>
          <span className="conductor-name">Conductor</span>
        </span>
        {attached && (
          <>
            <span className="conductor-sep">·</span>
            <span className="conductor-file">{attached.name}</span>
            <span
              className="conductor-progress"
              data-testid="conductor-header-filename-pill"
            >
              {done}/{total}
            </span>
          </>
        )}
      </div>
      <div className="conductor-controls">
        {attached && (
          <>
            <button
              data-testid={
                paused ? 'conductor-header-resume' : 'conductor-header-pause'
              }
              className="ctrl-btn"
              onClick={onTogglePause}
              type="button"
            >
              {paused ? '▶ resume' : '❚❚ pause'}
            </button>
            <button
              data-testid="conductor-header-cancel"
              className="ctrl-btn ctrl-btn-danger"
              onClick={onCancel}
              type="button"
            >
              ✕ cancel
            </button>
          </>
        )}
      </div>
    </>
  );
}
