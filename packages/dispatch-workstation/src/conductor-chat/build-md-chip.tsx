// MB-T-MVP-W3-CONDUCTOR-CHAT WB3 (gen-7 lane, renumbered) — BuildMdChip.
//
// Render-only chip displaying an attached build.md filename + step count
// + optional remove × button. Mounts at FROZEN testid
// "conductor-composer-buildmd-chip" per
// docs/coordination/w3-testid-contract-2026-05-17.md line 17.
//
// Component shape mirrors design conductor-chat.jsx:48-62 verbatim
// (operator-vision 23b4362 §"Component 3" + arbitration commit 94d3e17
// §5.3 + design bundle a20d0d4).
//
// Cross-session contract: operator-CC composer.tsx (their WB3 lane)
// imports this component and renders it in the .composer-attachments
// row when `attached` prop is non-null. The placeholder testid is used
// by operator-CC's probe-03 to verify mount slot; this real body
// satisfies the design-spec props + DOM contract.
//
// Q-W3-6 = (b) inline-style React precedent (matches conductor-message.tsx
// at a0baa19). Q-W3-8 = (b) prop-driven; no default attachment — parent
// (composer or mount) decides when to render this chip based on its own
// `attached` state.
//
// Design CSS tokens (Conductor V_MVP.html:13-31 dark theme +
// :645-668 .buildmd-chip rules) hard-coded inline. CSS @keyframes /
// :hover pseudo-states cannot be expressed in React.CSSProperties;
// the design .buildmd-chip-x:hover { color: var(--err) } is omitted at
// WB3 — visual hover-state animation gap will be addressed at WB-final
// alongside conductor-message.tsx typing-dot animation gap (per WB2
// commit a0baa19 follow-up note).

import * as React from 'react';

// ─── Design tokens (Conductor V_MVP.html:13-31, dark theme) ────────────
const TOKENS = {
  text: '#ececef',
  textDim: '#8a8a93',
  textMute: '#5a5a63',
  panel2: '#181820',
  border: '#23232b',
} as const;

const MONO_STACK = "'IBM Plex Mono', monospace";

// ─── Props ─────────────────────────────────────────────────────────────
export interface BuildMdChipProps {
  name: string;
  steps: number;
  onRemove?: () => void;
}

// ─── Styles (design CSS at Conductor V_MVP.html:645-668) ───────────────
const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: TOKENS.panel2,
  border: `1px solid ${TOKENS.border}`,
  padding: '4px 8px 4px 8px',
  borderRadius: 6,
  color: TOKENS.textDim,
  fontSize: 12,
};

const nameStyle: React.CSSProperties = {
  color: TOKENS.text,
  fontFamily: MONO_STACK,
  fontSize: 11.5,
};

const metaStyle: React.CSSProperties = {
  color: TOKENS.textMute,
  fontFamily: MONO_STACK,
  fontSize: 10.5,
  paddingLeft: 6,
  borderLeft: `1px solid ${TOKENS.border}`,
};

const xBtnStyle: React.CSSProperties = {
  color: TOKENS.textMute,
  fontSize: 16,
  lineHeight: 1,
  padding: '0 2px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
};

// ─── Component ─────────────────────────────────────────────────────────
export function BuildMdChip({
  name,
  steps,
  onRemove,
}: BuildMdChipProps): React.ReactElement {
  return (
    <div
      className="buildmd-chip"
      data-testid="conductor-composer-buildmd-chip"
      style={chipStyle}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect
          x="2"
          y="1.5"
          width="9"
          height="11"
          rx="1"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M4.5 5h4M4.5 7h4M4.5 9h2.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="buildmd-chip-name"
        data-testid="conductor-composer-buildmd-chip-name"
        style={nameStyle}
      >
        {name}
      </span>
      <span
        className="buildmd-chip-meta"
        data-testid="conductor-composer-buildmd-chip-meta"
        style={metaStyle}
      >
        {steps} steps
      </span>
      {onRemove && (
        <button
          className="buildmd-chip-x"
          data-testid="conductor-composer-buildmd-chip-x"
          onClick={onRemove}
          aria-label="Remove"
          style={xBtnStyle}
        >
          ×
        </button>
      )}
    </div>
  );
}
