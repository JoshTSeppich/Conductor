import { describe, it, expect } from 'vitest';
import { HealthResponse } from 'dispatch-core/src/v2/schema.js';

// T18 contract-additive consumer test for DAEMON-S03 ADR's
// `notifications_available: boolean` field on /v2/health.
//
// Authority chain for the schema extension:
//   - DAEMON-S03 ADR §"Patterns locked in / /v2/health response
//     shape (contract-additive)" — explicitly prescribes this
//     field as additive per contract §2
//   - DAEMON-S03 ADR §"Cross-session impacts" — "additive change.
//     Adding `notifications_available: boolean` is contract-
//     additive per §2. Session B's UI can treat it as optional
//     (default-false) when consuming"
//   - Project instructions §3.4 — operator-arbitrated mechanical
//     translation is operator-supervised and CC-delegable when
//     scoped tightly. 1 line of zod = tight scope.
//   - Operator best-judgment arbitration this turn: Path A acked.
//
// The field is z.boolean().optional() so legacy daemons that
// haven't shipped the field yet still parse cleanly. Bridge
// reads `parsed.notifications_available ?? false` per Decision 6.
describe('WEB-T18 HealthResponse schema (contract-additive notifications_available)', () => {
  it('accepts both shapes: with and without notifications_available', () => {
    // Shape 1: legacy / pre-S03 daemon (field omitted) — must
    // parse without error per "default-false until proven
    // otherwise" graceful-degradation rule.
    const legacy = HealthResponse.parse({
      status: 'ok',
      version: '2.0.0',
      uptime_seconds: 42,
    });
    expect(legacy.notifications_available).toBeUndefined();

    // Shape 2: S03-compliant daemon emits the field.
    const enriched = HealthResponse.parse({
      status: 'ok',
      version: '2.0.0',
      uptime_seconds: 42,
      notifications_available: true,
    });
    expect(enriched.notifications_available).toBe(true);

    // Shape 3: explicit false also parses (graceful-degradation
    // signal from daemon when notifier probe failed at startup).
    const explicit = HealthResponse.parse({
      status: 'ok',
      version: '2.0.0',
      uptime_seconds: 42,
      notifications_available: false,
    });
    expect(explicit.notifications_available).toBe(false);
  });
});
