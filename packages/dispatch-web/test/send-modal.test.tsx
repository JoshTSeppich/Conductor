import { describe, it, expect, beforeEach } from 'vitest';
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
import { SendModal } from '../src/components/SendModal.js';
import { useUIStore } from '../src/store/ui.js';

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
});

describe('WEB-T15 SendModal', () => {
  it('visibility toggle: sendModalOpen true → dialog renders title; false → not visible', () => {
    const { wrapper } = createWrapper();
    const { rerender } = render(<SendModal />, { wrapper });
    // Initially closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    rerender(<SendModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/send prompt to sherpa/i)).toBeInTheDocument();
  });

  it.each([
    { input: '', label: 'empty' },
    { input: '   ', label: 'whitespace-only' },
  ])(
    'Send disabled when prompt body is $label',
    ({ input }) => {
      const { wrapper } = createWrapper();
      act(() => {
        useUIStore.setState({ sendModalOpen: true });
      });
      render(<SendModal />, { wrapper });
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: input } });
      const dialog = screen.getByRole('dialog');
      const send = within(dialog).getByRole('button', { name: /^Send$/ });
      expect((send as HTMLButtonElement).disabled).toBe(true);
    },
  );

  it('Send enabled when prompt body has non-whitespace content', () => {
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    const dialog = screen.getByRole('dialog');
    const send = within(dialog).getByRole('button', { name: /^Send$/ });
    expect((send as HTMLButtonElement).disabled).toBe(false);
  });

  it('submit fires POST /v2/sessions/sherpa/prompts with body field per schema', async () => {
    let receivedBody: { body?: string } | null = null;
    server.use(
      http.post('/v2/sessions/:name/prompts', async ({ request }) => {
        receivedBody = (await request.json()) as { body: string };
        return HttpResponse.json({
          sent_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/archive/sherpa/0001.prompt.md',
        });
      }),
    );
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'do thing X' },
    });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Send$/ }));
    await waitFor(() => {
      expect(receivedBody?.body).toBe('do thing X');
    });
  });

  it('success → modal closes + toast banner pushed with "Prompt sent to <name>"', async () => {
    server.use(
      http.post('/v2/sessions/:name/prompts', () =>
        HttpResponse.json({
          sent_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/archive/sherpa/0001.prompt.md',
        }),
      ),
    );
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'go' },
    });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Send$/ }));

    await waitFor(() => {
      expect(useUIStore.getState().sendModalOpen).toBe(false);
    });
    const banners = useUIStore.getState().banners;
    expect(banners.length).toBe(1);
    expect(banners[0].kind).toBe('toast');
    expect(banners[0].severity).toBe('info');
    expect(banners[0].title).toMatch(/prompt sent to sherpa/i);
  });

  it('422 → inline error rendered + modal stays open + body preserved', async () => {
    server.use(
      http.post('/v2/sessions/:name/prompts', () =>
        HttpResponse.json(
          { error: 'session_not_armed' },
          { status: 422 },
        ),
      ),
    );
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'preserved-body-text' },
    });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Send$/ }));

    // Inline error appears
    await waitFor(() => {
      expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeInTheDocument();
    });
    // Modal still open
    expect(useUIStore.getState().sendModalOpen).toBe(true);
    // Body preserved (textarea still has the typed text)
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'preserved-body-text',
    );
    // No success banner pushed
    expect(useUIStore.getState().banners.length).toBe(0);
  });

  it('pending → Send disabled + "Sending…" label; Cancel still functional', async () => {
    let resolvePost: ((value: Response) => void) | null = null;
    server.use(
      http.post('/v2/sessions/:name/prompts', () => {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }),
    );
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'go' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Send$/ }));

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByRole('button', { name: /sending/i }),
      ).toBeDisabled();
    });
    // Cancel still functional
    const cancel = within(screen.getByRole('dialog')).getByRole('button', { name: /^Cancel$/ });
    expect((cancel as HTMLButtonElement).disabled).toBe(false);

    // Cleanup pending request
    if (resolvePost) {
      (resolvePost as (value: Response) => void)(
        HttpResponse.json({
          sent_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        }),
      );
    }
  });

  it('Cancel button + Escape key both close modal without firing mutation', () => {
    let postCallCount = 0;
    server.use(
      http.post('/v2/sessions/:name/prompts', () => {
        postCallCount += 1;
        return HttpResponse.json({
          sent_at: '2026-04-27T12:00:00.000Z',
          archived_to: '/tmp/x.md',
        });
      }),
    );
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });

    // Sub-case 1: Cancel button
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Cancel$/ }));
    expect(useUIStore.getState().sendModalOpen).toBe(false);

    // Sub-case 2: Escape key
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(useUIStore.getState().sendModalOpen).toBe(false);

    expect(postCallCount).toBe(0);
  });

  it('form state resets when modal reopens (no stale draft)', () => {
    const { wrapper } = createWrapper();
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    render(<SendModal />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'first-draft' },
    });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'first-draft',
    );

    // Close
    act(() => {
      useUIStore.setState({ sendModalOpen: false });
    });
    // Reopen
    act(() => {
      useUIStore.setState({ sendModalOpen: true });
    });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });
});
