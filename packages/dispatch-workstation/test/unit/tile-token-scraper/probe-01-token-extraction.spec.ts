// §C.5 WB1 red — tile-token-scraper.ts
//   - ANSI strip before regex: raw PTY escapes don't fool the extractor
//   - /([0-9]+) tokens/g last-match wins (most recent status bar update)
//   - 500ms debounce batches rapid chunks per session
//   - non-matching chunks fire no callback
//   - per-session debounce: sessionA and sessionB timers are independent
//   - dispose() removes observer and stops callbacks

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerTileTokenScraper } from '../../../src/main/tile-token-scraper.js';

// ─── Fake broadcaster ────────────────────────────────────────────────────────

function makeFakeBroadcaster() {
  const observers = new Set<(sessionName: string, chunk: string) => void>();
  return {
    broadcaster: {
      addStdoutObserver(fn: (sessionName: string, chunk: string) => void): () => void {
        observers.add(fn);
        return () => { observers.delete(fn); };
      },
    },
    emit(sessionName: string, chunk: string): void {
      observers.forEach((fn) => fn(sessionName, chunk));
    },
    observerCount(): number { return observers.size; },
  };
}

// ─── ANSI-laden chunk helpers ─────────────────────────────────────────────────

// Mimics the CC CLI status-bar line as it arrives in the raw PTY stream:
// cursor-move to position + token text + further escape sequences.
function ansiStatusBar(tokens: number): string {
  return `\x1b[50;1H\x1b[0m  ⏵⏵ bypass permissions on\x1b[50;193H${tokens} tokens\x1b[50;220H\x1b[?25l`;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('§C.5 tile-token-scraper — ANSI strip + regex extraction', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('extracts token count from ANSI-encoded status-bar chunk', () => {
    const { broadcaster, emit } = makeFakeBroadcaster();
    const calls: Array<{ sessionName: string; tokensUsed: number }> = [];
    registerTileTokenScraper({
      broadcaster,
      onTokenUpdate: (sessionName, tokensUsed) => calls.push({ sessionName, tokensUsed }),
      debounceMs: 500,
    });

    emit('sess-a', ansiStatusBar(24220));
    vi.advanceTimersByTime(600);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ sessionName: 'sess-a', tokensUsed: 24220 });
  });

  it('extracts token count from plain (non-ANSI) chunk', () => {
    const { broadcaster, emit } = makeFakeBroadcaster();
    const calls: Array<{ sessionName: string; tokensUsed: number }> = [];
    registerTileTokenScraper({
      broadcaster,
      onTokenUpdate: (sessionName, tokensUsed) => calls.push({ sessionName, tokensUsed }),
      debounceMs: 500,
    });

    emit('sess-a', '  ⏵⏵ bypass permissions on (shift+tab to cycle)                    33863 tokens');
    vi.advanceTimersByTime(600);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ sessionName: 'sess-a', tokensUsed: 33863 });
  });

  it('fires no callback when chunk contains no token count', () => {
    const { broadcaster, emit } = makeFakeBroadcaster();
    const calls: unknown[] = [];
    registerTileTokenScraper({
      broadcaster,
      onTokenUpdate: (...args) => calls.push(args),
      debounceMs: 500,
    });

    emit('sess-a', '\x1b[2J\x1b[H'); // screen clear only
    emit('sess-a', 'Some assistant response text without a status bar');
    vi.advanceTimersByTime(600);

    expect(calls).toHaveLength(0);
  });

  it('last match wins when chunk contains multiple token counts', () => {
    const { broadcaster, emit } = makeFakeBroadcaster();
    const calls: Array<{ tokensUsed: number }> = [];
    registerTileTokenScraper({
      broadcaster,
      onTokenUpdate: (_s, tokensUsed) => calls.push({ tokensUsed }),
      debounceMs: 500,
    });

    // Chunk with two status-bar updates (mid-stream + final)
    emit('sess-a', `${ansiStatusBar(23000)}${ansiStatusBar(24220)}`);
    vi.advanceTimersByTime(600);

    expect(calls).toHaveLength(1);
    expect(calls[0].tokensUsed).toBe(24220);
  });
});

describe('§C.5 tile-token-scraper — debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('debounces rapid chunks to a single callback with the last token count', () => {
    const { broadcaster, emit } = makeFakeBroadcaster();
    const calls: Array<{ tokensUsed: number }> = [];
    registerTileTokenScraper({
      broadcaster,
      onTokenUpdate: (_s, tokensUsed) => calls.push({ tokensUsed }),
      debounceMs: 500,
    });

    emit('sess-a', ansiStatusBar(100));
    vi.advanceTimersByTime(100);
    emit('sess-a', ansiStatusBar(200));
    vi.advanceTimersByTime(100);
    emit('sess-a', ansiStatusBar(300));
    // 200ms elapsed — debounce not yet fired
    expect(calls).toHaveLength(0);

    vi.advanceTimersByTime(500);
    expect(calls).toHaveLength(1);
    expect(calls[0].tokensUsed).toBe(300);
  });

  it('per-session debounce: sessionA and sessionB fire independently', () => {
    const { broadcaster, emit } = makeFakeBroadcaster();
    const calls: Array<{ sessionName: string; tokensUsed: number }> = [];
    registerTileTokenScraper({
      broadcaster,
      onTokenUpdate: (sessionName, tokensUsed) => calls.push({ sessionName, tokensUsed }),
      debounceMs: 500,
    });

    emit('sess-a', ansiStatusBar(1000));
    vi.advanceTimersByTime(300);
    emit('sess-b', ansiStatusBar(2000));
    vi.advanceTimersByTime(300); // sess-a fires at 600ms; sess-b at 600ms from its emit
    // sess-a debounce fires here (600ms from emit)
    expect(calls.filter((c) => c.sessionName === 'sess-a')).toHaveLength(1);

    vi.advanceTimersByTime(300); // sess-b debounce fires here (600ms from its emit)
    expect(calls.filter((c) => c.sessionName === 'sess-b')).toHaveLength(1);
    expect(calls.find((c) => c.sessionName === 'sess-a')!.tokensUsed).toBe(1000);
    expect(calls.find((c) => c.sessionName === 'sess-b')!.tokensUsed).toBe(2000);
  });
});

describe('§C.5 tile-token-scraper — cleanup', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('dispose() removes the stdout observer and stops callbacks', () => {
    const fake = makeFakeBroadcaster();
    const calls: unknown[] = [];
    const dispose = registerTileTokenScraper({
      broadcaster: fake.broadcaster,
      onTokenUpdate: (...args) => calls.push(args),
      debounceMs: 500,
    });

    expect(fake.observerCount()).toBe(1);
    dispose();
    expect(fake.observerCount()).toBe(0);

    fake.emit('sess-a', ansiStatusBar(9999));
    vi.advanceTimersByTime(600);
    expect(calls).toHaveLength(0);
  });

  it('dispose() cancels pending debounce timer', () => {
    const fake = makeFakeBroadcaster();
    const calls: unknown[] = [];
    const dispose = registerTileTokenScraper({
      broadcaster: fake.broadcaster,
      onTokenUpdate: (...args) => calls.push(args),
      debounceMs: 500,
    });

    fake.emit('sess-a', ansiStatusBar(5000));
    // Dispose before debounce fires
    dispose();
    vi.advanceTimersByTime(600);
    expect(calls).toHaveLength(0);
  });
});
