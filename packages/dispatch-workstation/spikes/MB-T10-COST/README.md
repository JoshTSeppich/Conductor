# MB-T10-COST spike — Tier 4 cost-validation finding (HALT 2)

**Status:** RESOLVED — operator picked Option A (raise ceiling) 2026-05-06.
**Filed:** 2026-05-06 by sess-mbt10 WB6.
**Trigger:** P16 (cost-validation acceptance assertion at 30KB ceiling) FAILED.

## Resolution (2026-05-06)

Operator selected **Option A**: raise the v3.0 acceptance ceiling from 30KB to 60KB and reconcile `CONDUCTOR_V3_RESCOPE.md §3.5 line 136`. Probe ceiling updated to 60KB; rescope estimate revised from ~24KB to ~60KB at schema-permitted maxima. WB6 ships GREEN under this ceiling; WB7 unblocks. This spike doc preserved as historical audit trail of the finding + decision; not throwaway evidence per MB-S01 spike convention.

## Measurement

Probe: `packages/dispatch-workstation/test/integration/coarchitect-tier4-cost/probe-15-cost-validation.spec.ts`

```
N = 8 sessions
Per session:
  recent_handoff:        4096 ASCII chars (Q-MBT10-6=a slice ceiling)
  recent_console_tail:   2048 ASCII chars
  pending_intents:       3 entries (UUID + step/total + intent_summary)
  last_action_fired_at:  ISO-8601 datetime
  last_operator_typed_at: null

Buffer.byteLength(JSON.stringify(payload), 'utf8') = 55,702 bytes (54.40 KB)
Ceiling (probe assertion):                          30,720 bytes (30.00 KB)
Overage:                                            24,982 bytes (~24 KB)
```

(KNOWN — measurement reproducible by running `pnpm exec vitest run --passWithNoTests test/integration/coarchitect-tier4-cost`.)

## Why this exceeds the rescope estimate

`docs/CONDUCTOR_V3_RESCOPE.md` §3.5 line 136: *"capped at 8 sessions = ~24KB max"*.

The 24KB estimate appears to assume **typical** field sizes, not **schema-permitted maximums**:

- `SessionContextSnapshotSchema` does NOT cap `recent_console_tail`. The probe used 2048 chars; the schema would accept arbitrarily long strings.
- `Q-MBT10-6=a` defines `recent_handoff` as the *last 4096 chars* of HANDOFF.md — i.e. 4KB is the per-session ceiling. The rescope's 24KB / 8 sessions ≈ 3KB per session implies it modeled a smaller-than-ceiling handoff.
- `pending_intents: []` was likely modeled empty in the rescope estimate (per `MB-T11 wires the orchestrator-side state that fills the array` comment at `dispatch-core/src/v3/schema.ts:673`). The probe populated 3 entries (~450 bytes) per session.

**Per-session bytes (raw content, no JSON envelope):**
- Handoff:                 4096 bytes
- Console tail:            2048 bytes
- 3 pending intents:       ~450 bytes
- Timestamps + nulls:      ~80 bytes
- **Subtotal per session:** ~6,674 bytes
- **× 8 sessions:**         ~53,392 bytes

The remaining ~2.3 KB comes from JSON syntax: object braces, key names (`"recent_handoff"`, `"sessions_context"`, `"pending_intents"`, etc.), commas, quotes, escapes.

## Decision matrix (operator)

**Option A — Raise the probe ceiling.** Revise P16 from 30KB → 60KB (or another operator-chosen value). Updates `CONDUCTOR_V3_RESCOPE.md §3.5 line 136` to match the measured ceiling at the schema's permitted maximums. Probe and rescope estimate become consistent. WB7 unblocks.

**Option B — Cap field sizes in the schema.** Add zod `.max()` constraints (e.g. `recent_console_tail: z.string().max(512).nullable()`, cap pending_intents to `.max(N)`). Forces fixture content under the rescope's 24KB estimate. Requires schema edit + WB1 contract revisit.

**Option C — Truncate in `assembleTier4Payload`.** Apply a per-session size cap in the workstation builder (e.g. slice handoff to 2048 chars, console_tail to 512 chars before assembly). Schema unchanged, but builder enforces the cost budget. Operator-visible truncation marker (e.g. `"…[truncated]"`) keeps the orchestrator aware.

**Option D — Defer realistic-content cost-validation.** Rewrite P15+P16 fixture to use the rescope-estimate-aligned sizes (≤ 2KB handoff, ≤ 512B console tail, 0 pending_intents) and ship as a *floor* test rather than a *schema-ceiling* test. Land WB6 GREEN, defer max-size measurement to a later cost-validation pass (or to MB-T11 once realistic per-session content shapes are observable).

**Option E — Hybrid: operator-chosen budget + truncation in builder.** Combine A + C: operator picks a final ceiling (e.g. 40KB), the builder enforces it via per-session truncation, and the probe validates the enforcement. Most defensible long-term but largest scope expansion.

## What sess-mbt10 recommends (MODELED)

**Lean toward Option A (raise ceiling) for v3.0.** Rationale:

1. The schema-permitted maximums (4KB handoff per Q-MBT10-6=a) are explicit operator arbitration; reverting them via Option B re-opens a settled question.
2. Anthropic Sonnet 4.6 context window is 200K tokens (~800KB at 4 bytes/token). 60KB at v3.0 8-session ceiling is ~7.5% of the window — well within budget for the orchestrator call. The 30KB probe ceiling I picked was overly conservative; the rescope's 24KB estimate appears to be a back-of-envelope guess, not a hard architectural constraint.
3. Option C (truncation) adds runtime complexity for a pre-MB-T11 budget concern — premature when the actual content distribution is unknown.
4. Option D (defer) is acceptable but loses the schema-ceiling signal that operator may want preserved for v3.1 when MB-T11 starts populating real content.

(MODELED — reasoning is sess-mbt10 inference, not operator-arbitrated. Operator overrides this recommendation.)

## What sess-mbt10 will NOT do without operator direction

- Raise or change the probe ceiling.
- Revise schema with `.max()` constraints.
- Add truncation logic in `assembleTier4Payload`.
- Ship WB7.

## Pointer back to the probe

The probe file is intentionally left in its **current failing state** (uncommitted) so the next sess-mbt10 turn can edit it under operator-chosen guidance. If operator directs Option A: edit the probe ceiling. Option B: edit `dispatch-core/src/v3/schema.ts`. Option C: edit `dispatch-workstation/src/coarchitect/tier4-builder.ts`. Option D: edit fixture sizes in the probe.

If operator directs **commit-then-decide** (commit the probe failing as a known-RED audit-trail entry under a `red(MB-T10):` grammar), sess-mbt10 will adjust the WB6 grammar and ship the probe + this spike doc together.
