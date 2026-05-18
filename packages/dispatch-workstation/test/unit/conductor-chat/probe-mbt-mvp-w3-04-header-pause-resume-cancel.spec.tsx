// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB4 probe-04 — Header brand/filename-pill/pause/resume/cancel.
//
// Probes the header chrome surface for the Component-3 conductor-chat region
// (design conductor-chat.jsx:82-109 + Conductor V_MVP.html:485-528).
// Asserts the FROZEN testid surface from
// docs/coordination/w3-testid-contract-2026-05-17.md §HEADER:
//   - conductor-header-brand          (C-mark + "Conductor"; always visible)
//   - conductor-header-filename-pill  (done/total pill — only when attached)
//   - conductor-header-pause          (only when attached && !paused)
//   - conductor-header-resume         (only when attached && paused)
//   - conductor-header-cancel         (only when attached)
//
// Pause/resume is a single button whose testid swaps with state per the
// contract: `-pause` when !paused, `-resume` when paused. Both testids are
// mutually exclusive in the DOM at any moment.
//
// Filename-pill text content is `${total - queue.length}/${total}` per
// design conductor-chat.jsx:91-94. The literal attached.name string is
// rendered as a sibling text node inside the header (no separate testid).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../../src/conductor-chat/header.js';

describe('MB-T-MVP-W3 WB4 — Header', () => {
  it('renders without throwing on minimum props (attached=null)', () => {
    expect(() => render(<Header attached={null} />)).not.toThrow();
  });

  it('brand: testid present; contains "C" mark + "Conductor" wordmark; visible always', () => {
    render(<Header attached={null} />);
    const brand = screen.getByTestId('conductor-header-brand');
    expect(brand).toBeInTheDocument();
    expect(brand.textContent).toContain('C');
    expect(brand.textContent).toContain('Conductor');
  });

  it('detached state: no filename-pill / pause / resume / cancel testids in document', () => {
    render(<Header attached={null} />);
    expect(
      screen.queryByTestId('conductor-header-filename-pill'),
    ).toBeNull();
    expect(screen.queryByTestId('conductor-header-pause')).toBeNull();
    expect(screen.queryByTestId('conductor-header-resume')).toBeNull();
    expect(screen.queryByTestId('conductor-header-cancel')).toBeNull();
  });

  it('attached: filename-pill shows done/total format + attached.name appears in header', () => {
    render(
      <Header
        attached={{ name: 'auth-rewrite.build.md', steps: 10 }}
        queue={[{}, {}, {}]}
        total={10}
      />,
    );
    const pill = screen.getByTestId('conductor-header-filename-pill');
    expect(pill).toBeInTheDocument();
    // done = total - queue.length = 10 - 3 = 7
    expect(pill.textContent).toBe('7/10');

    // attached.name is rendered as a sibling text node in the header
    const brand = screen.getByTestId('conductor-header-brand');
    // brand container is the header-left "title" zone; attached.name lives alongside it
    expect(brand.parentElement?.textContent).toContain('auth-rewrite.build.md');
  });

  it('attached + !paused: pause testid present; resume testid absent; click → onTogglePause once', () => {
    const onTogglePause = vi.fn();
    render(
      <Header
        attached={{ name: 'x.build.md', steps: 5 }}
        queue={[{}, {}]}
        total={5}
        paused={false}
        onTogglePause={onTogglePause}
      />,
    );
    const pause = screen.getByTestId('conductor-header-pause');
    expect(pause).toBeInTheDocument();
    expect(screen.queryByTestId('conductor-header-resume')).toBeNull();
    fireEvent.click(pause);
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it('attached + paused: resume testid present; pause testid absent; click → onTogglePause once', () => {
    const onTogglePause = vi.fn();
    render(
      <Header
        attached={{ name: 'x.build.md', steps: 5 }}
        queue={[{}, {}]}
        total={5}
        paused={true}
        onTogglePause={onTogglePause}
      />,
    );
    const resume = screen.getByTestId('conductor-header-resume');
    expect(resume).toBeInTheDocument();
    expect(screen.queryByTestId('conductor-header-pause')).toBeNull();
    fireEvent.click(resume);
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it('attached: cancel testid present; click → onCancel once', () => {
    const onCancel = vi.fn();
    render(
      <Header
        attached={{ name: 'x.build.md', steps: 5 }}
        queue={[]}
        total={5}
        paused={false}
        onCancel={onCancel}
      />,
    );
    const cancel = screen.getByTestId('conductor-header-cancel');
    expect(cancel).toBeInTheDocument();
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
