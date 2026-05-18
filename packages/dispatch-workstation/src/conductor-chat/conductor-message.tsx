// MB-T-MVP-W3-CONDUCTOR-CHAT WB2 — ConductorMessage component.
//
// Four-role discriminated-union message renderer for the Component-3
// surface (operator-vision 23b4362 §"Component 3 — conductor-chat" +
// arbitration commit 94d3e17 §5.3 + design bundle a20d0d4
// docs/design-handoff/conductor-v-mvp/project/conductor-chat.jsx:5-46
// + :113-121 for the typing-indicator variant).
//
// Pattern (Phase-1 diagnose): build-fresh, do not fork
// coarchitect/chat-panel.tsx ChatBubble (structurally incompatible:
// 2 roles vs 4, slate palette vs amber, marker-parsed widgets vs
// role=dispatch). Honors territorial manifest naming.
//
// Q-W3-6 = (b) inline-style React matching coarchitect/chat-panel.tsx
// precedent. Design CSS tokens (Conductor V_MVP.html:13-49) hard-coded
// into the style objects below — token-import strategy deferred to W1
// EXPANSION-2 sweep. className anchors retained for design-source-
// fidelity reference + WB6 screenshot oracle (NORMATIVE per §5.5).
//
// Pixel-perfect visual fidelity is asserted at WB6 (idle-only oracle
// per Q-W3-2 = (a)). WB2 ships role-rendering correctness only.

import * as React from 'react';

// ─── Design tokens (Conductor V_MVP.html:13-31, dark theme) ────────────
const TOKENS = {
  text: '#ececef',
  textDim: '#8a8a93',
  textMute: '#5a5a63',
  accent: '#f0a062',
  userBubble: '#1c1c24',
  userBubbleBorder: '#2a2a34',
  bg: '#0a0a0b',
} as const;

const MONO_STACK = "'IBM Plex Mono', monospace";

// ─── Message variant types ─────────────────────────────────────────────
export type ConductorMessageVariant =
  | { role: 'user'; text: string; id?: string }
  | {
      role: 'assistant';
      text: string;
      id?: string;
      children?: React.ReactNode;
    }
  | {
      role: 'dispatch';
      step: number;
      total: number;
      target: string;
      task: string;
      id?: string;
    }
  | { role: 'system'; text: string; id?: string }
  | { role: 'typing'; running: number; id?: string };

export interface ConductorMessageProps {
  m: ConductorMessageVariant;
}

// ─── Styles per variant (design CSS at Conductor V_MVP.html:541-632) ───
const userRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const userBubbleStyle: React.CSSProperties = {
  background: TOKENS.userBubble,
  border: `1px solid ${TOKENS.userBubbleBorder}`,
  padding: '8px 13px',
  borderRadius: 16,
  borderTopRightRadius: 4,
  maxWidth: '70%',
  fontSize: 14,
  lineHeight: 1.45,
  color: TOKENS.text,
};

const assistantRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '26px 1fr',
  gap: 10,
  alignItems: 'start',
};

const assistantMarkStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 5,
  background: TOKENS.accent,
  color: TOKENS.bg,
  fontFamily: MONO_STACK,
  fontSize: 12,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 1,
};

const assistantBodyStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.55,
  color: TOKENS.text,
};

const assistantParagraphStyle: React.CSSProperties = {
  margin: '0 0 6px 0',
};

const dispatchRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '4px 1fr',
  gap: 12,
  paddingLeft: 22,
};

const dispatchRuleStyle: React.CSSProperties = {
  background: `linear-gradient(to bottom, ${TOKENS.accent}, ${TOKENS.accent}33)`,
  borderRadius: 99,
};

const dispatchBodyStyle: React.CSSProperties = { padding: '2px 0' };

const dispatchHeadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: MONO_STACK,
  fontSize: 10.5,
  color: TOKENS.textMute,
  marginBottom: 3,
};

const dispatchBadgeStyle: React.CSSProperties = {
  color: TOKENS.accent,
  fontWeight: 600,
  letterSpacing: '0.12em',
};

const dispatchStepStyle: React.CSSProperties = { color: TOKENS.textMute };
const dispatchArrowStyle: React.CSSProperties = { color: TOKENS.textMute };
const dispatchTargetStyle: React.CSSProperties = {
  color: TOKENS.text,
  fontWeight: 500,
};

const dispatchTaskStyle: React.CSSProperties = {
  fontFamily: MONO_STACK,
  fontSize: 12.5,
  color: TOKENS.text,
  lineHeight: 1.45,
};

const systemRowStyle: React.CSSProperties = {
  fontFamily: MONO_STACK,
  fontSize: 11.5,
  color: TOKENS.textMute,
  textAlign: 'center',
};

const systemDotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 4,
  height: 4,
  background: TOKENS.textMute,
  borderRadius: 99,
  verticalAlign: 'middle',
  marginRight: 5,
};

const typingDotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 5,
  height: 5,
  background: TOKENS.textMute,
  borderRadius: 99,
  marginRight: 3,
};

const typingLabelStyle: React.CSSProperties = {
  color: TOKENS.textMute,
  fontSize: 12.5,
  marginLeft: 6,
};

// ─── Component ─────────────────────────────────────────────────────────
export function ConductorMessage({
  m,
}: ConductorMessageProps): React.ReactElement {
  if (m.role === 'user') {
    return (
      <div
        className="msg msg-user"
        data-testid="conductor-message-user"
        style={userRowStyle}
      >
        <div
          className="msg-user-bubble"
          data-testid="conductor-message-user-bubble"
          style={userBubbleStyle}
        >
          {m.text}
        </div>
      </div>
    );
  }

  if (m.role === 'dispatch') {
    return (
      <div
        className="msg msg-dispatch"
        data-testid="conductor-message-dispatch"
        style={dispatchRowStyle}
      >
        <div
          className="dispatch-rule"
          data-testid="conductor-message-dispatch-rule"
          style={dispatchRuleStyle}
        />
        <div className="dispatch-body" style={dispatchBodyStyle}>
          <div className="dispatch-head" style={dispatchHeadStyle}>
            <span
              className="dispatch-badge"
              data-testid="conductor-message-dispatch-badge"
              style={dispatchBadgeStyle}
            >
              DISPATCH
            </span>
            <span
              className="dispatch-step"
              data-testid="conductor-message-dispatch-step"
              style={dispatchStepStyle}
            >
              step {m.step}/{m.total}
            </span>
            <span
              className="dispatch-arrow"
              data-testid="conductor-message-dispatch-arrow"
              style={dispatchArrowStyle}
            >
              →
            </span>
            <span
              className="dispatch-target"
              data-testid="conductor-message-dispatch-target"
              style={dispatchTargetStyle}
            >
              {m.target}
            </span>
          </div>
          <div
            className="dispatch-task"
            data-testid="conductor-message-dispatch-task"
            style={dispatchTaskStyle}
          >
            {m.task}
          </div>
        </div>
      </div>
    );
  }

  if (m.role === 'system') {
    return (
      <div
        className="msg msg-system"
        data-testid="conductor-message-system"
        style={systemRowStyle}
      >
        <span
          className="sys-dot"
          data-testid="conductor-message-system-dot"
          style={systemDotStyle}
        />{' '}
        {m.text}
      </div>
    );
  }

  if (m.role === 'typing') {
    const label =
      m.running === 1 ? 'watching 1 agent…' : `watching ${m.running} agents…`;
    return (
      <div
        className="msg msg-assistant msg-typing"
        data-testid="conductor-message-typing"
        style={assistantRowStyle}
      >
        <div
          className="msg-assistant-mark"
          data-testid="conductor-message-typing-mark"
          style={assistantMarkStyle}
        >
          C
        </div>
        <div
          className="msg-assistant-body"
          data-testid="conductor-message-typing-body"
          style={assistantBodyStyle}
        >
          <span
            className="typing-dot"
            data-testid="conductor-message-typing-dot"
            style={typingDotStyle}
          />
          <span
            className="typing-dot"
            data-testid="conductor-message-typing-dot"
            style={typingDotStyle}
          />
          <span
            className="typing-dot"
            data-testid="conductor-message-typing-dot"
            style={typingDotStyle}
          />
          <span
            className="typing-label"
            data-testid="conductor-message-typing-label"
            style={typingLabelStyle}
          >
            {label}
          </span>
        </div>
      </div>
    );
  }

  // assistant — Conductor speaking
  const lines = m.text.split('\n');
  return (
    <div
      className="msg msg-assistant"
      data-testid="conductor-message-assistant"
      style={assistantRowStyle}
    >
      <div
        className="msg-assistant-mark"
        data-testid="conductor-message-assistant-mark"
        style={assistantMarkStyle}
      >
        C
      </div>
      <div
        className="msg-assistant-body"
        data-testid="conductor-message-assistant-body"
        style={assistantBodyStyle}
      >
        {lines.map((line, i) => (
          <p key={i} style={assistantParagraphStyle}>
            {line}
          </p>
        ))}
        {m.children}
      </div>
    </div>
  );
}
