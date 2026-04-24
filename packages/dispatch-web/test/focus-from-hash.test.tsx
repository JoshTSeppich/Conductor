import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { useFocusFromHash } from '../src/hooks/useFocusFromHash.js';
import { useUIStore } from '../src/store/ui.js';
import { KanbanPanel } from '../src/components/KanbanPanel.js';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';

// Minimal component that mounts the hook for isolated hook tests.
function HookHost() {
  useFocusFromHash();
  return null;
}

const baseSession: SessionResponseV2Type = {
  cwd: '/test/path',
  tmux_target: 'sherpa:0.0',
  handoff_path: '/test/HANDOFF.md',
  last_prompt_sent_at: null,
  last_handoff_pulled_at: null,
  state: 'armed',
  last_commit_sha: null,
  last_status_json_at: null,
  computed_status: 'idle',
  status_json: null,
  recent_events: [],
};

beforeEach(() => {
  useUIStore.setState(
    {
      focusedSessionName: null,
      showArchived: false,
      sendModalOpen: false,
      killConfirmOpen: false,
      killConfirmTarget: null,
      connectionStatus: 'connected',
      commitBySession: {},
      banners: [],
      authRetryNonce: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  // Reset hash via replaceState to avoid hashchange fire from the
  // beforeEach itself.
  if (window.location.hash !== '') {
    window.history.replaceState(null, '', window.location.pathname);
  }
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
});

describe('WEB-T11 useFocusFromHash + card click integration', () => {
  it('reads initial #session=<name> hash on mount and updates focusedSessionName', async () => {
    window.history.replaceState(null, '', '#session=sherpa');
    render(<HookHost />);
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe('sherpa');
    });
  });

  it('responds to hashchange events; subsequent changes update store', async () => {
    render(<HookHost />);
    expect(useUIStore.getState().focusedSessionName).toBe(null);

    window.history.replaceState(null, '', '#session=scribe');
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe('scribe');
    });
  });

  it('SessionCard click in KanbanPanel updates both window.location.hash and store', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: { 'sherpa-001': baseSession },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('sherpa-001')).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /sherpa-001/i }),
    );

    expect(window.location.hash).toBe('#session=sherpa-001');
    expect(useUIStore.getState().focusedSessionName).toBe('sherpa-001');
  });

  it('empty hash, empty value (#session=), and wrong prefix all clear focus to null', async () => {
    window.history.replaceState(null, '', '#session=sherpa');
    render(<HookHost />);
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe('sherpa');
    });

    // Empty hash → null
    window.history.replaceState(null, '', window.location.pathname);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe(null);
    });

    // Reset to focused
    window.history.replaceState(null, '', '#session=sherpa');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe('sherpa');
    });

    // Empty value (#session=) → null (regex requires 1+ chars)
    window.history.replaceState(null, '', '#session=');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe(null);
    });

    // Reset
    window.history.replaceState(null, '', '#session=sherpa');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe('sherpa');
    });

    // Wrong prefix → null
    window.history.replaceState(null, '', '#foo=bar');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(useUIStore.getState().focusedSessionName).toBe(null);
    });
  });
});
