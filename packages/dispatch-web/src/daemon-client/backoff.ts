// Ported from packages/dispatch-web/spikes/UI-S01-websocket-client/
// client.ts (SpikeClient). Same algorithm, same constants as
// operator-acked in UI-S01 ADR.

export interface BackoffConfig {
  baseMs: number;
  multiplier: number;
  capMs: number;
  jitter: number;
}

export const DEFAULT_BACKOFF: BackoffConfig = {
  baseMs: 1000,
  multiplier: 2,
  capMs: 30_000,
  jitter: 0.25,
};

export function computeBackoff(
  attempt: number,
  cfg: BackoffConfig,
  random: () => number = Math.random,
): number {
  const raw = Math.min(
    cfg.baseMs * Math.pow(cfg.multiplier, attempt),
    cfg.capMs,
  );
  const jitterAmt = raw * cfg.jitter;
  return raw - jitterAmt + random() * 2 * jitterAmt;
}
