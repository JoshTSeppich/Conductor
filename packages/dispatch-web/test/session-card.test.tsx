import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionCard, formatAge } from '../src/components/SessionCard.js';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../src/store/ui.js';

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

// Step 6: SessionCard reads commitBySession from store for branch
// sub-line. Reset to empty between tests to keep cases isolated.
beforeEach(() => {
  useUIStore.setState({ commitBySession: {} });
});

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

  // Phase 2 Step 6 — wireframe variant C session-card enrichment.
  // Adds: status dot (color from computed_status), repo·branch
  // sub-line. Model chip + context % deferred — model needs schema
  // edit (frozen contract per scaffold §3); context % default §7.7
  // is hide-until-daemon-ships.
  describe('Phase 2 Step 6 — enrichment', () => {
    it('renders a status-dot with title carrying computed_status', () => {
      render(<SessionCard name="sherpa" session={baseSession} />);
      const dot = screen.getByTestId('session-status-dot');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('title', 'awaiting_review');
    });

    it('renders repo·branch sub-line; branch falls back to "—" when no commit landed', () => {
      // cwd '/test/path' → basename 'path'; commitBySession empty.
      render(<SessionCard name="sherpa" session={baseSession} />);
      expect(screen.getByText('path · —')).toBeInTheDocument();
    });

    it('renders repo·branch sub-line with branch from commitBySession when commit landed', () => {
      useUIStore.setState({
        commitBySession: {
          sherpa: {
            sha: 'abc123',
            subject: 'init',
            branch: 'feat/x',
            at: '2026-04-23T12:00:00.000Z',
          },
        },
      });
      render(<SessionCard name="sherpa" session={baseSession} />);
      expect(screen.getByText('path · feat/x')).toBeInTheDocument();
    });

    it('isolates branch by session name (different session keys do not bleed)', () => {
      useUIStore.setState({
        commitBySession: {
          'other-session': {
            sha: 'aaa',
            subject: 'x',
            branch: 'unrelated',
            at: '2026-04-23T12:00:00.000Z',
          },
        },
      });
      render(<SessionCard name="sherpa" session={baseSession} />);
      // 'sherpa' has no commit entry → fallback '—'
      expect(screen.getByText('path · —')).toBeInTheDocument();
      expect(screen.queryByText(/unrelated/)).not.toBeInTheDocument();
    });
  });
});
