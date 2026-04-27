import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { SendButton } from '../src/components/SendButton.js';
import { useUIStore } from '../src/store/ui.js';
import type {
  SessionResponseV2Type,
  State,
} from 'dispatch-core/src/v2/schema.js';

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

function withState(state: State): SessionResponseV2Type {
  return { ...baseSession, state };
}

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
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
});

describe('WEB-T14 SendButton', () => {
  it('armed state → button enabled', () => {
    const { wrapper } = createWrapper();
    render(<SendButton session={withState('armed')} />, { wrapper });
    const button = screen.getByRole('button', { name: /send/i });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it.each<State>(['paused', 'held', 'killed'])(
    'state %s → button disabled; click does not open modal',
    (state) => {
      const { wrapper } = createWrapper();
      render(<SendButton session={withState(state)} />, { wrapper });
      const button = screen.getByRole('button', { name: /send/i });
      expect((button as HTMLButtonElement).disabled).toBe(true);

      // Click disabled button: regression guard against accidental
      // refactor from `disabled` to `aria-disabled` (which still
      // dispatches click events). Native disabled blocks click.
      fireEvent.click(button);
      expect(useUIStore.getState().sendModalOpen).toBe(false);
    },
  );

  it('armed click → openSendModal invoked; Zustand sendModalOpen becomes true', () => {
    const { wrapper } = createWrapper();
    render(<SendButton session={withState('armed')} />, { wrapper });
    expect(useUIStore.getState().sendModalOpen).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(useUIStore.getState().sendModalOpen).toBe(true);
  });
});
