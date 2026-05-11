// §C.5 WB4 — static model → context-window-size lookup.
//
// All active v3.5 substrates share a 200k context window.
// Returns DEFAULT_CONTEXT_WINDOW for any unrecognised model string so that
// future model releases degrade gracefully rather than silently producing NaN.

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-sonnet-4-6': 200_000,
  'claude-opus-4-7': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
};

const DEFAULT_CONTEXT_WINDOW = 200_000;

export function getContextWindow(modelId: string): number {
  return MODEL_CONTEXT_WINDOWS[modelId] ?? DEFAULT_CONTEXT_WINDOW;
}
