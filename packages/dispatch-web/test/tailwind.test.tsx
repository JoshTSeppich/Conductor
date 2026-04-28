import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

// SendModal (T15) + PullButton (T16) call useQueryClient via their
// mutation hooks; this suite renders Layout (which → FocusedDetailPanel
// → PullButton) without a QueryClient wrapper. Mock both to no-ops —
// behavior is covered by test/send-modal.test.tsx + test/pull-button.test.tsx.
// Per finding-#22 test-coupling survey: mock-vs-provide choice is a
// function of test purpose; this suite asserts class-string presence,
// not component behavior.
vi.mock('../src/components/SendModal.js', () => ({
  SendModal: () => null,
}));
vi.mock('../src/components/PullButton.js', () => ({
  PullButton: () => null,
}));
// T19: TickerPanel now consumes useSessions (Query) for filter
// dropdown population. Mock to no-op for class-string assertion
// purpose. Same finding-#22 mitigation pattern as SendModal /
// PullButton above.
vi.mock('../src/components/TickerPanel.js', () => ({
  TickerPanel: () => null,
}));

import { Layout } from '../src/components/Layout.js';
import { useUIStore } from '../src/store/ui.js';

// happy-dom does not reliably resolve computed Tailwind styles
// (CSS variables, oklch tokens, @theme directive). Per pre-reg
// gate fallback plan: tests verify the className strings are
// present in the rendered DOM. Real-browser visual verification
// is post-MVP system-test cluster.

beforeEach(() => {
  useUIStore.setState(
    {
      connectionStatus: 'connected',
      banners: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
});

describe('WEB-T07 Tailwind refactor', () => {
  it('Layout main grid uses Tailwind grid classes with lg: responsive variant', () => {
    const { container } = render(<Layout />);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    // Default (small viewport) stacks via flex-col; lg: variant
    // switches to grid with 60/40 columns. Both class strings
    // must be present for Tailwind to resolve responsive behavior.
    expect(main!.className).toMatch(/flex-col/);
    expect(main!.className).toMatch(/lg:grid/);
  });

  it('Layout main element no longer carries inline display style (refactor verified)', () => {
    const { container } = render(<Layout />);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    // Pre-T07 used style={{ display: 'grid' }}. Post-refactor
    // styling moves entirely to Tailwind utility classes — no
    // inline display attribute on main.
    expect(main!.style.display).toBe('');
  });

  it('Components include dark: variants on at least one bg/text pair', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { connectionStatus: 'daemon_down' } as any,
    );
    const { container } = render(<Layout />);
    // Search the rendered subtree for at least one element with
    // a dark: variant class. Smoke check that dark mode is wired
    // into the components, not actual visual verification.
    const allElements = container.querySelectorAll('*');
    const hasDarkVariant = Array.from(allElements).some((el) =>
      /\bdark:/.test(el.className?.toString() ?? ''),
    );
    expect(hasDarkVariant).toBe(true);
  });
});
