// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB1 probe-01 — ConductorChat scaffold.
//
// Verifies the minimum three-row structural contract for the Component-3
// surface (operator-vision 23b4362 §"Component 3 — conductor-chat" +
// arbitration commit 94d3e17 §5.3 + design bundle a20d0d4
// docs/design-handoff/conductor-v-mvp/project/conductor-chat.jsx):
//
//   - Module exports a named `ConductorChat`
//   - <ConductorChat /> renders without throwing on minimum props
//   - Root element has data-testid="conductor-chat-root"
//   - Header anchor exists at data-testid="conductor-chat-header" (root child 0)
//   - Thread anchor exists at data-testid="conductor-chat-thread" (root child 1)
//   - Composer anchor exists at data-testid="conductor-chat-composer" (root child 2)
//   - DOM order is header → thread → composer (mirrors conductor-chat.jsx:82-167
//     and CSS grid-template-rows: 36px 1fr auto at Conductor V_MVP.html:478)
//   - Full design-spec prop interface accepted (optional at WB1)
//
// Pre-WB2 the message role rendering is NOT exercised (header/thread/composer
// rendered as empty content slots). Pre-WB3 the composer interactions are
// not exercised. Pre-WB4 the header controls are not exercised. Pre-WB6 the
// pixel-perfect CSS layout is not asserted (screenshot-fidelity is the
// normative oracle per arbitration §5.5). This probe asserts ONLY that the
// renderer surface mounts cleanly and exposes the three named row anchors
// in the correct order.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConductorChat } from '../../../src/conductor-chat/conductor-chat.js';

describe('MB-T-MVP-W3 WB1 — ConductorChat scaffold', () => {
  it('renders without throwing on minimum props (messages=[], onSend=fn)', () => {
    const onSend = vi.fn();
    expect(() =>
      render(<ConductorChat messages={[]} onSend={onSend} />),
    ).not.toThrow();
  });

  it('exposes the root sentinel at data-testid="conductor-chat-root"', () => {
    render(<ConductorChat messages={[]} onSend={vi.fn()} />);
    expect(screen.getByTestId('conductor-chat-root')).toBeInTheDocument();
  });

  it('exposes the header anchor at data-testid="conductor-chat-header"', () => {
    render(<ConductorChat messages={[]} onSend={vi.fn()} />);
    expect(screen.getByTestId('conductor-chat-header')).toBeInTheDocument();
  });

  it('exposes the thread anchor at data-testid="conductor-chat-thread"', () => {
    render(<ConductorChat messages={[]} onSend={vi.fn()} />);
    expect(screen.getByTestId('conductor-chat-thread')).toBeInTheDocument();
  });

  it('exposes the composer anchor at data-testid="conductor-chat-composer"', () => {
    render(<ConductorChat messages={[]} onSend={vi.fn()} />);
    expect(screen.getByTestId('conductor-chat-composer')).toBeInTheDocument();
  });

  it('places header at root child 0, thread at 1, composer at 2 (DOM order)', () => {
    render(<ConductorChat messages={[]} onSend={vi.fn()} />);
    const root = screen.getByTestId('conductor-chat-root');
    expect(root.children).toHaveLength(3);
    expect(root.children[0]).toBe(screen.getByTestId('conductor-chat-header'));
    expect(root.children[1]).toBe(screen.getByTestId('conductor-chat-thread'));
    expect(root.children[2]).toBe(screen.getByTestId('conductor-chat-composer'));
  });

  it('accepts the full design-spec prop interface without throwing', () => {
    expect(() =>
      render(
        <ConductorChat
          messages={[]}
          onSend={vi.fn()}
          attached={null}
          queue={[]}
          running={0}
          total={0}
          paused={false}
          onAttach={vi.fn()}
          onDetach={vi.fn()}
          onDispatchNext={vi.fn()}
          onTogglePause={vi.fn()}
          onCancel={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
