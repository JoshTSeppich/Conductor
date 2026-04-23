import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { usePatchState } from '../../src/query/usePatchState.js';
import { usePostPrompt } from '../../src/query/usePostPrompt.js';
import { useGetHandoff } from '../../src/query/useGetHandoff.js';

// Matrix-drift guard per packages/dispatch-web/TICKETS.md §2.2:
// mutations auto-invalidate ['sessions'] + ['session', name]; the
// handoff GET does NOT invalidate. If future maintenance changes the
// matrix without a deliberate contract update, this test breaks.
describe('WEB-T04 invalidation matrix', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('usePatchState + usePostPrompt invalidate sessions+session(:name); useGetHandoff invalidates nothing', async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const patchHook = renderHook(() => usePatchState(), { wrapper });
    await act(async () => {
      await patchHook.result.current.mutateAsync({
        name: 'sherpa',
        state: 'paused',
      });
    });

    const patchCalls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(patchCalls).toContainEqual(['sessions']);
    expect(patchCalls).toContainEqual(['session', 'sherpa']);

    spy.mockClear();

    const postHook = renderHook(() => usePostPrompt(), { wrapper });
    await act(async () => {
      await postHook.result.current.mutateAsync({
        name: 'sherpa',
        body: 'x',
      });
    });

    const postCalls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(postCalls).toContainEqual(['sessions']);
    expect(postCalls).toContainEqual(['session', 'sherpa']);

    spy.mockClear();

    const pullHook = renderHook(() => useGetHandoff(), { wrapper });
    await act(async () => {
      await pullHook.result.current.mutateAsync({ name: 'sherpa' });
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
