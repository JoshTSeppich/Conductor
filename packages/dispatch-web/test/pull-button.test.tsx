import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { PullButton } from '../src/components/PullButton.js';
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

// happy-dom 15 does not ship navigator.clipboard. Per pre-reg
// Decision 9 + finding #22 test-coupling survey: install a per-
// test stub via Object.defineProperty (vi.stubGlobal works at the
// globalThis-key level but does not nest into navigator.* — direct
// property def is the documented happy-dom workaround).
//
// The stub returns a vi.fn() that tests can swap mock impl on
// (mockResolvedValue / mockRejectedValue) per outcome branch.
let writeTextMock: Mock;

function installClipboardStub(impl: () => Promise<void>): Mock {
  writeTextMock = vi.fn(impl);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
    writable: true,
  });
  return writeTextMock;
}

beforeEach(() => {
  useUIStore.setState(
    {
      focusedSessionName: 'sherpa',
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
  // Default: writeText resolves successfully. Per-test overrides as
  // needed (rejection tests reinstall before render).
  installClipboardStub(() => Promise.resolve());
});

afterEach(() => {
  // Remove the property so tests that don't install a stub get a
  // clean baseline (otherwise carryover from prior test could mask
  // a missing stub).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).clipboard;
});

describe('WEB-T16 PullButton', () => {
  it('renders with label "Pull"', () => {
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    expect(
      screen.getByRole('button', { name: /^Pull$/ }),
    ).toBeInTheDocument();
  });

  it.each<State>(['armed', 'paused', 'held', 'killed'])(
    'enabled in state %s (no state-gating per UI-S04 ADR — pull is read-only against handoff history)',
    (state) => {
      const { wrapper } = createWrapper();
      render(<PullButton session={withState(state)} />, { wrapper });
      const button = screen.getByRole('button', { name: /^Pull$/ });
      expect((button as HTMLButtonElement).disabled).toBe(false);
    },
  );

  it('click → GET /v2/sessions/sherpa/handoff fires with correct path', async () => {
    let calledPath: string | null = null;
    server.use(
      http.get('/v2/sessions/:name/handoff', ({ request }) => {
        calledPath = new URL(request.url).pathname;
        return HttpResponse.json({
          content: 'handoff body',
          written_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        });
      }),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));
    await waitFor(() => {
      expect(calledPath).toBe('/v2/sessions/sherpa/handoff');
    });
  });

  it('success path → writeText called with content + toast "Copied handoff for sherpa" (severity=info)', async () => {
    server.use(
      http.get('/v2/sessions/:name/handoff', () =>
        HttpResponse.json({
          content: 'handoff-body-text',
          written_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('handoff-body-text');
    });
    const banners = useUIStore.getState().banners;
    expect(banners.length).toBe(1);
    expect(banners[0].kind).toBe('toast');
    expect(banners[0].severity).toBe('info');
    expect(banners[0].title).toMatch(/copied handoff for sherpa/i);
  });

  it('404 path → toast "No handoff written yet" (severity=info), writeText NOT called', async () => {
    server.use(
      http.get('/v2/sessions/:name/handoff', () =>
        HttpResponse.json({ error: 'no_handoff' }, { status: 404 }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));

    await waitFor(() => {
      const banners = useUIStore.getState().banners;
      expect(banners.length).toBe(1);
    });
    const banners = useUIStore.getState().banners;
    expect(banners[0].kind).toBe('toast');
    expect(banners[0].severity).toBe('info');
    expect(banners[0].title).toMatch(/no handoff written yet/i);
    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it('clipboard rejection → CopyFallbackModal opens with content pre-selected; no toast', async () => {
    installClipboardStub(() =>
      Promise.reject(new DOMException('NotAllowedError')),
    );
    server.use(
      http.get('/v2/sessions/:name/handoff', () =>
        HttpResponse.json({
          content: 'fallback-body',
          written_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    // Textarea contains handoff content
    const dialog = screen.getByRole('dialog');
    const textarea = within(dialog).getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('fallback-body');
    // No toast pushed (modal IS the FM3 surface; no parallel toast)
    expect(useUIStore.getState().banners.length).toBe(0);
  });

  it('fallback modal Copy button retries writeText (fresh gesture); on success closes modal + pushes toast', async () => {
    // First writeText (auto, post-fetch) rejects → modal opens.
    // Second writeText (Copy button click) resolves → modal closes.
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValueOnce(new DOMException('NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    server.use(
      http.get('/v2/sessions/:name/handoff', () =>
        HttpResponse.json({
          content: 'retry-body',
          written_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    // Click Copy inside modal
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Copy$/ }));

    // writeText called twice: once auto, once via Copy button
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(2);
    });
    // Modal closes after successful retry
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // Toast pushed after retry success
    const banners = useUIStore.getState().banners;
    expect(banners.length).toBe(1);
    expect(banners[0].title).toMatch(/copied handoff for sherpa/i);
  });

  it('pending state → button label "Pulling…" + disabled while fetch in flight', async () => {
    let resolveGet: ((value: Response) => void) | null = null;
    server.use(
      http.get('/v2/sessions/:name/handoff', () => {
        return new Promise<Response>((resolve) => {
          resolveGet = resolve;
        });
      }),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /pulling/i });
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });

    // Cleanup pending request
    if (resolveGet) {
      (resolveGet as (value: Response) => void)(
        HttpResponse.json({
          content: 'x',
          written_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        }),
      );
    }
    // Drain the resulting writeText so afterEach delete doesn't race
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('network failure (500) → error toast "Couldn\'t pull handoff"; writeText NOT called', async () => {
    server.use(
      http.get('/v2/sessions/:name/handoff', () =>
        HttpResponse.json({ error: 'internal' }, { status: 500 }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<PullButton session={withState('armed')} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Pull$/ }));

    await waitFor(() => {
      const banners = useUIStore.getState().banners;
      expect(banners.length).toBe(1);
    });
    const banners = useUIStore.getState().banners;
    expect(banners[0].kind).toBe('toast');
    expect(banners[0].severity).toBe('error');
    expect(banners[0].title).toMatch(/couldn't pull handoff/i);
    expect(writeTextMock).not.toHaveBeenCalled();
  });
});
