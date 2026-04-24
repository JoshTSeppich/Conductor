import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionCard, formatAge } from '../src/components/SessionCard.js';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';

const baseSession: SessionResponseV2Type = {
  cwd: '/test/path',
  tmux_target: 'my-session:1.2',
  handoff_path: '/test/HANDOFF.md',
  last_prompt_sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  last_handoff_pulled_at: null,
  state: 'paused',
  last_commit_sha: null,
  last_status_json_at: null,
  computed_status: 'awaiting_review',
  status_json: null,
  recent_events: [],
};

describe('WEB-T10 SessionCard', () => {
  it('renders all fields: name, UPPERCASE state badge, tmux target, formatted age', () => {
    render(<SessionCard name="sherpa-001" session={baseSession} />);
    expect(screen.getByText('sherpa-001')).toBeInTheDocument();
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
    expect(screen.getByText('my-session:1.2')).toBeInTheDocument();
    // 5m ago last_prompt_sent_at → "5m" formatted age
    expect(screen.getByText('5m')).toBeInTheDocument();
  });

  it('is keyboard-focusable; Enter triggers onClick', () => {
    const spy = vi.fn();
    render(
      <SessionCard name="sherpa-001" session={baseSession} onClick={spy} />,
    );
    const card = screen.getByRole('button', { name: /sherpa-001/i });
    expect(card.tabIndex).toBe(0);
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('mouse click triggers onClick', () => {
    const spy = vi.fn();
    render(
      <SessionCard name="sherpa-001" session={baseSession} onClick={spy} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /sherpa-001/i }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('formatAge: covers all branches (<1m, minutes, hours, days)', () => {
    expect(formatAge(30_000)).toBe('<1m');
    expect(formatAge(5 * 60_000)).toBe('5m');
    expect(formatAge(3 * 60 * 60_000)).toBe('3h');
    expect(formatAge(2 * 24 * 60 * 60_000)).toBe('2d');
  });
});
