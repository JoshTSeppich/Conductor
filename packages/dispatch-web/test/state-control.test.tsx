import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { StateControlCluster } from '../src/components/StateControlCluster.js';
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

describe('WEB-T13 StateControlCluster', () => {
  it('armed state: Pause/Hold/Kill enabled; Arm disabled', () => {
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('armed')} name="sherpa" />,
      { wrapper },
    );
    expect((screen.getByRole('button', { name: /^Arm$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Pause$/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /^Hold$/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /^Kill$/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('paused state: Arm/Kill enabled; Pause/Hold disabled', () => {
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('paused')} name="sherpa" />,
      { wrapper },
    );
    expect((screen.getByRole('button', { name: /^Arm$/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /^Pause$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Hold$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Kill$/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('held state: Arm/Kill enabled; Pause/Hold disabled', () => {
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('held')} name="sherpa" />,
      { wrapper },
    );
    expect((screen.getByRole('button', { name: /^Arm$/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /^Pause$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Hold$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Kill$/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('killed state: all 4 buttons disabled (terminal)', () => {
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('killed')} name="sherpa" />,
      { wrapper },
    );
    expect((screen.getByRole('button', { name: /^Arm$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Pause$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Hold$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Kill$/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each<{ from: State; targetButton: string; targetState: State }>([
    { from: 'armed', targetButton: 'Pause', targetState: 'paused' },
    { from: 'armed', targetButton: 'Hold', targetState: 'held' },
    { from: 'paused', targetButton: 'Arm', targetState: 'armed' },
    { from: 'held', targetButton: 'Arm', targetState: 'armed' },
  ])(
    'non-kill transition: $from → click $targetButton fires PATCH state=$targetState',
    async ({ from, targetButton, targetState }) => {
      let receivedBody: { state?: string } | null = null;
      server.use(
        http.patch('/v2/sessions/:name/state', async ({ request }) => {
          receivedBody = (await request.json()) as { state: string };
          return HttpResponse.json({
            ...withState(targetState),
          });
        }),
      );
      const { wrapper } = createWrapper();
      render(
        <StateControlCluster session={withState(from)} name="sherpa" />,
        { wrapper },
      );
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${targetButton}$`) }));
      await waitFor(() => {
        expect(receivedBody?.state).toBe(targetState);
      });
    },
  );

  it('Kill click opens KillConfirmModal; no PATCH fires yet', () => {
    let patchCallCount = 0;
    server.use(
      http.patch('/v2/sessions/:name/state', () => {
        patchCallCount += 1;
        return HttpResponse.json(withState('killed'));
      }),
    );
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('armed')} name="sherpa" />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /^Kill$/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Kill session sherpa\?/i)).toBeInTheDocument();
    expect(patchCallCount).toBe(0);
  });

  it('Modal Confirm → PATCH state=killed fires + modal closes', async () => {
    let receivedBody: { state?: string } | null = null;
    server.use(
      http.patch('/v2/sessions/:name/state', async ({ request }) => {
        receivedBody = (await request.json()) as { state: string };
        return HttpResponse.json(withState('killed'));
      }),
    );
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('armed')} name="sherpa" />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /^Kill$/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(receivedBody?.state).toBe('killed');
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Modal Cancel button OR Escape key closes modal without PATCH', async () => {
    let patchCallCount = 0;
    server.use(
      http.patch('/v2/sessions/:name/state', () => {
        patchCallCount += 1;
        return HttpResponse.json(withState('killed'));
      }),
    );
    const { wrapper } = createWrapper();
    const { rerender, unmount } = render(
      <StateControlCluster session={withState('armed')} name="sherpa" />,
      { wrapper },
    );

    // Sub-case 1: Cancel button
    fireEvent.click(screen.getByRole('button', { name: /^Kill$/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Sub-case 2: Escape key
    fireEvent.click(screen.getByRole('button', { name: /^Kill$/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(patchCallCount).toBe(0);
    unmount();
  });

  it('422 response → pushes error banner via Zustand', async () => {
    server.use(
      http.patch('/v2/sessions/:name/state', () =>
        HttpResponse.json({ error: 'invalid_transition' }, { status: 422 }),
      ),
    );
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('armed')} name="sherpa" />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /^Pause$/ }));
    await waitFor(() => {
      const banners = useUIStore.getState().banners;
      expect(banners.length).toBeGreaterThan(0);
      expect(banners[0].severity).toBe('error');
    });
  });

  it('pending mutation disables all buttons and modal Confirm shows "Killing…"', async () => {
    let resolvePatch: ((value: Response) => void) | null = null;
    server.use(
      http.patch('/v2/sessions/:name/state', () => {
        return new Promise<Response>((resolve) => {
          resolvePatch = resolve;
        });
      }),
    );
    const { wrapper } = createWrapper();
    render(
      <StateControlCluster session={withState('armed')} name="sherpa" />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /^Kill$/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /confirm/i }));

    // While pending: all buttons disabled; Confirm reads "Killing…"
    await waitFor(() => {
      expect(
        within(screen.getByRole('dialog')).getByRole('button', { name: /killing/i }),
      ).toBeDisabled();
    });
    expect((screen.getByRole('button', { name: /^Pause$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Hold$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /^Kill$/ }) as HTMLButtonElement).disabled).toBe(true);

    // Cleanup: resolve the pending request so next tests aren't affected
    if (resolvePatch) {
      (resolvePatch as (value: Response) => void)(
        HttpResponse.json(withState('killed')),
      );
    }
  });
});
