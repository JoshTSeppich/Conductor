// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB3 probe-03 — Composer paperclip+textarea+send+chip+dispatch-next.
//
// Probes the composer interaction surface for the Component-3 conductor-chat
// region (design conductor-chat.jsx:124-165 + Conductor V_MVP.html:683-732).
// Asserts the FROZEN testid surface from
// docs/coordination/w3-testid-contract-2026-05-17.md §COMPOSER:
//   - conductor-composer-paperclip      (click → onAttach)
//   - conductor-composer-textarea       (Enter sends; Shift+Enter doesn't;
//                                        placeholder swaps on attached)
//   - conductor-composer-send           (disabled when empty/whitespace;
//                                        click → onSend(trimmed) + clears draft)
//   - conductor-composer-buildmd-chip   (placeholder stub; gen-7 W3 ships
//                                        the real BuildMdChip body in
//                                        src/conductor-chat/build-md-chip.tsx)
//   - conductor-composer-dispatch-next  (shown when attached
//                                        + queue.length>0 + !paused)
//
// BuildMdChip is a PLACEHOLDER in this composer per cross-session
// arbitration (docs/coordination/w3-testid-contract-2026-05-17.md §COMPOSER).
// The placeholder is a stub <div> with the chip testid + className
// "conductor-composer-buildmd-chip" + the filename text content — gen-7 W3
// later swaps for the real body via mount/integration wiring (their WB5).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Composer } from '../../../src/conductor-chat/composer.js';

describe('MB-T-MVP-W3 WB3 — Composer', () => {
  it('renders without throwing on minimum props (onSend, onAttach)', () => {
    expect(() =>
      render(<Composer onSend={vi.fn()} onAttach={vi.fn()} />),
    ).not.toThrow();
  });

  it('paperclip button: testid present; click invokes onAttach exactly once', () => {
    const onAttach = vi.fn();
    render(<Composer onSend={vi.fn()} onAttach={onAttach} />);
    const paperclip = screen.getByTestId('conductor-composer-paperclip');
    expect(paperclip).toBeInTheDocument();
    fireEvent.click(paperclip);
    expect(onAttach).toHaveBeenCalledTimes(1);
  });

  it('textarea: testid present; placeholder swaps based on attached state', () => {
    const { rerender } = render(
      <Composer onSend={vi.fn()} onAttach={vi.fn()} />,
    );
    const detached = screen.getByTestId(
      'conductor-composer-textarea',
    ) as HTMLTextAreaElement;
    expect(detached).toBeInTheDocument();
    expect(detached.placeholder.toLowerCase()).toContain('drop a build.md');

    rerender(
      <Composer
        onSend={vi.fn()}
        onAttach={vi.fn()}
        attached={{ name: 'foo.build.md', steps: 5 }}
      />,
    );
    const attached = screen.getByTestId(
      'conductor-composer-textarea',
    ) as HTMLTextAreaElement;
    expect(attached.placeholder.toLowerCase()).toContain('add guidance');
  });

  it('send button: disabled when textarea empty or whitespace-only', () => {
    render(<Composer onSend={vi.fn()} onAttach={vi.fn()} />);
    const send = screen.getByTestId(
      'conductor-composer-send',
    ) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    const textarea = screen.getByTestId(
      'conductor-composer-textarea',
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '   \n   ' } });
    expect(send.disabled).toBe(true);
  });

  it('send button: enabled when non-empty; click invokes onSend(trimmed) + clears draft', () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} onAttach={vi.fn()} />);
    const textarea = screen.getByTestId(
      'conductor-composer-textarea',
    ) as HTMLTextAreaElement;
    const send = screen.getByTestId(
      'conductor-composer-send',
    ) as HTMLButtonElement;

    fireEvent.change(textarea, { target: { value: '  hello world  ' } });
    expect(send.disabled).toBe(false);

    fireEvent.click(send);
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('hello world');
    expect(textarea.value).toBe('');
  });

  it('Enter (no Shift) sends; Shift+Enter does NOT send', () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} onAttach={vi.fn()} />);
    const textarea = screen.getByTestId(
      'conductor-composer-textarea',
    ) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'first' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenLastCalledWith('first');

    fireEvent.change(textarea, { target: { value: 'second' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).toHaveBeenCalledTimes(1); // unchanged — Shift+Enter must not send
  });

  it('when attached + queue.length>0 + !paused: buildmd-chip placeholder + dispatch-next visible', () => {
    const onDispatchNext = vi.fn();
    render(
      <Composer
        onSend={vi.fn()}
        onAttach={vi.fn()}
        attached={{ name: 'auth-rewrite.build.md', steps: 10 }}
        queue={[{}, {}, {}]}
        paused={false}
        onDispatchNext={onDispatchNext}
      />,
    );
    const chip = screen.getByTestId('conductor-composer-buildmd-chip');
    expect(chip).toBeInTheDocument();
    expect(chip.className).toContain('conductor-composer-buildmd-chip');
    expect(chip.textContent).toContain('auth-rewrite.build.md');

    const next = screen.getByTestId('conductor-composer-dispatch-next');
    expect(next).toBeInTheDocument();
    fireEvent.click(next);
    expect(onDispatchNext).toHaveBeenCalledTimes(1);
  });

  it('dispatch-next hidden when paused; hidden when queue empty; whole attachments hidden when not attached', () => {
    // paused=true → no dispatch-next (chip still visible since attached)
    const { rerender } = render(
      <Composer
        onSend={vi.fn()}
        onAttach={vi.fn()}
        attached={{ name: 'x.build.md', steps: 3 }}
        queue={[{}, {}]}
        paused={true}
      />,
    );
    expect(
      screen.queryByTestId('conductor-composer-dispatch-next'),
    ).toBeNull();
    expect(
      screen.getByTestId('conductor-composer-buildmd-chip'),
    ).toBeInTheDocument();

    // queue=[] → no dispatch-next (chip still visible since attached)
    rerender(
      <Composer
        onSend={vi.fn()}
        onAttach={vi.fn()}
        attached={{ name: 'x.build.md', steps: 3 }}
        queue={[]}
        paused={false}
      />,
    );
    expect(
      screen.queryByTestId('conductor-composer-dispatch-next'),
    ).toBeNull();
    expect(
      screen.getByTestId('conductor-composer-buildmd-chip'),
    ).toBeInTheDocument();

    // attached=null → entire attachments section absent
    rerender(<Composer onSend={vi.fn()} onAttach={vi.fn()} />);
    expect(
      screen.queryByTestId('conductor-composer-buildmd-chip'),
    ).toBeNull();
    expect(
      screen.queryByTestId('conductor-composer-dispatch-next'),
    ).toBeNull();
  });
});
