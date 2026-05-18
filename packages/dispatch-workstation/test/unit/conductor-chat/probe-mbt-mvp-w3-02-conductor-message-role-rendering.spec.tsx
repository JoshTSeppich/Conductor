// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB2 probe-02 — ConductorMessage role rendering.
//
// Verifies the four-role discriminated-union contract for ConductorMessage
// per design bundle a20d0d4 (docs/design-handoff/conductor-v-mvp/project/
// conductor-chat.jsx:5-46) — user / assistant / dispatch / system — plus
// the typing-indicator variant rendered when `running > 0` at the bottom
// of the thread (design conductor-chat.jsx:113-121).
//
// Pattern decision (Phase-1 diagnose R-build-fresh): structurally
// incompatible with coarchitect/chat-panel.tsx ChatBubble (2 roles, slate
// palette, marker-parsed side widgets). WB2 ships fresh ConductorMessage
// honoring territorial manifest naming.
//
// Q-W3-6 = (b) inline-style React matching coarchitect/chat-panel.tsx
// precedent: visual styling is asserted only at the class-anchor level
// here (data-testid + className). Pixel-perfect visual oracle is WB6.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConductorMessage } from '../../../src/conductor-chat/conductor-message.js';

describe('MB-T-MVP-W3 WB2 — ConductorMessage role rendering', () => {
  it('renders a user message with the user-bubble subtree', () => {
    render(<ConductorMessage m={{ role: 'user', text: 'hello conductor' }} />);
    const root = screen.getByTestId('conductor-message-user');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('msg-user');
    const bubble = screen.getByTestId('conductor-message-user-bubble');
    expect(bubble).toBeInTheDocument();
    expect(bubble.textContent).toBe('hello conductor');
  });

  it('renders an assistant message with the C-mark + body paragraphs', () => {
    render(
      <ConductorMessage
        m={{ role: 'assistant', text: 'line one\nline two\nline three' }}
      />,
    );
    const root = screen.getByTestId('conductor-message-assistant');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('msg-assistant');
    const mark = screen.getByTestId('conductor-message-assistant-mark');
    expect(mark.textContent).toBe('C');
    const body = screen.getByTestId('conductor-message-assistant-body');
    const paragraphs = body.querySelectorAll('p');
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].textContent).toBe('line one');
    expect(paragraphs[1].textContent).toBe('line two');
    expect(paragraphs[2].textContent).toBe('line three');
  });

  it('renders an assistant message with optional children appended after paragraphs', () => {
    render(
      <ConductorMessage
        m={{
          role: 'assistant',
          text: 'preamble',
          children: <div data-testid="assistant-extra-child">extra</div>,
        }}
      />,
    );
    expect(screen.getByTestId('conductor-message-assistant')).toBeInTheDocument();
    const child = screen.getByTestId('assistant-extra-child');
    expect(child).toBeInTheDocument();
    expect(child.textContent).toBe('extra');
  });

  it('renders a dispatch message with rule + head (badge/step/arrow/target) + task', () => {
    render(
      <ConductorMessage
        m={{
          role: 'dispatch',
          step: 3,
          total: 14,
          target: 'session-A',
          task: 'Refactor auth middleware to use new token store',
        }}
      />,
    );
    const root = screen.getByTestId('conductor-message-dispatch');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('msg-dispatch');
    expect(screen.getByTestId('conductor-message-dispatch-rule')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-message-dispatch-badge').textContent).toBe(
      'DISPATCH',
    );
    expect(screen.getByTestId('conductor-message-dispatch-step').textContent).toBe(
      'step 3/14',
    );
    expect(screen.getByTestId('conductor-message-dispatch-arrow').textContent).toBe('→');
    expect(screen.getByTestId('conductor-message-dispatch-target').textContent).toBe(
      'session-A',
    );
    expect(screen.getByTestId('conductor-message-dispatch-task').textContent).toBe(
      'Refactor auth middleware to use new token store',
    );
  });

  it('renders a system message with the sys-dot prefix + text', () => {
    render(
      <ConductorMessage m={{ role: 'system', text: 'orchestrator reconnected' }} />,
    );
    const root = screen.getByTestId('conductor-message-system');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('msg-system');
    expect(screen.getByTestId('conductor-message-system-dot')).toBeInTheDocument();
    expect(root.textContent).toContain('orchestrator reconnected');
  });

  it('renders a typing-indicator assistant variant with 3 dots + agent-count label (singular)', () => {
    render(<ConductorMessage m={{ role: 'typing', running: 1 }} />);
    const root = screen.getByTestId('conductor-message-typing');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('msg-typing');
    expect(root.className).toContain('msg-assistant');
    const dots = root.querySelectorAll('[data-testid="conductor-message-typing-dot"]');
    expect(dots).toHaveLength(3);
    const label = screen.getByTestId('conductor-message-typing-label');
    expect(label.textContent).toBe('watching 1 agent…');
  });

  it('renders the typing-indicator with plural agent-count when running > 1', () => {
    render(<ConductorMessage m={{ role: 'typing', running: 4 }} />);
    const label = screen.getByTestId('conductor-message-typing-label');
    expect(label.textContent).toBe('watching 4 agents…');
  });
});
