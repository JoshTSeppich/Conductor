# MB-F-CORE-READ-RECOVERY-OPT-IN — REPORT

Phase 2 aggregate report for **caller-controlled recovery semantics on
v1 `readRegistry`**. Closes sess-a finding #135 §Followups #2.

Branch: `sess-f/core-read-recovery` (cut from main `1098ebb`).
Ladder commits: WB1 RED → WB2 GREEN → WB3 verify → WB4 REPORT (this
file) → WB5 sess-f finding entry.

Mirror of sess-a's `registry-write-byte-stability/REPORT.md`
convention.

---

## §1 What was shipped

A two-line API change with substantial recovery-surface gain:

**Before** (43-line bare `readRegistry`):
```ts
export async function readRegistry(path?: string): Promise<Registry>
```
- ENOENT → fresh empty registry
- non-ENOENT readFile err → rethrow native
- JSON.parse fail → throw with path
- safeParse fail → throw with path
- No recovery, no quarantine

**After** (delegates to sess-a's `readJsonWithRecovery` helper):
```ts
export interface ReadRegistryOpts {
  onCorrupt?: 'rethrow' | 'quarantine';      // default 'rethrow'
  logger?: { error: (...args: unknown[]) => void };
}
export async function readRegistry(
  path?: string,
  opts?: ReadRegistryOpts,
): Promise<Registry>
```
- All pre-refactor paths preserved when `opts` omitted
- Optional `onCorrupt: 'quarantine'` recovers corrupt-or-invalid
  files into a fresh empty registry, preserving the original bytes
  in `<path>.corrupt-<ISO>` for forensics
- Mirrors v2 daemon's `readRegistryV2` pattern at
  `packages/dispatch-daemon/src/migration/schema-v2.ts:77-91`

**Net file changes:**
| Path | Action | Lines |
|---|---|---|
| `packages/dispatch-core/src/registry/read.ts` | refactor | +61 / -34 |
| `packages/dispatch-core/test/unit/registry-read-recovery.test.ts` | new | +305 |
| `packages/dispatch-core/test/unit/registry-read-recovery/REPORT.md` | new | (this file) |
| `docs/coordination/sess-f-findings-2026-05-06.md` | new (WB5) | (sess-f finding #160) |

No production code outside `read.ts` was modified. No test outside
the new `registry-read-recovery.test.ts` was modified.

---

## §2 Operator arbitrations applied (Q-F1 through Q-F4)

| ID | Decision | Status |
|---|---|---|
| **Q-F1** | **CRITICAL.** Inline literal `{ version: 1, sessions: {} }` at the call site each invocation. NO module-level `EMPTY_REGISTRY` constant. Preserves the operator-documented design choice from pre-refactor `read.ts:18-21` ("Fresh object each call... let callers pollute it via reference mutation"). Defends against the hazard at `dispatch-cli/src/commands/init.ts:36` (in-place mutation of `registry.sessions`). | ✅ APPLIED — `read.ts` line 62 (`emptyValue: { version: 1, sessions: {} }`). Pinned by R2 probe. KNOWN. |
| **Q-F2** | Accept merged-error-wording. Helper produces `Registry at ${path} is not valid JSON or failed validation: ${err.message}` instead of distinguishing JSON-parse vs schema-validate failures. Path preserved; no fd CLI call site pattern-matches on wording (FACT-F3 verified). | ✅ APPLIED — R3/R4 probes assert path-presence only via `rejects.toThrow(path)`, mirroring `registry.test.ts:111`. Existing test stays green. KNOWN. |
| **Q-F3** | Reuse sess-a's `EXPECTED_BYTES` + `FIXTURE` Registry verbatim. Pins `.passthrough()` invariant on the read side too (sess-a's WB4 covered the write side). | ✅ APPLIED — `registry-read-recovery.test.ts` lines 87-141 inline duplicate sess-a's WB4 fixture. R1 probe round-trips bytes → FIXTURE. KNOWN. |
| **Q-F4** | Include `logger` field on `ReadRegistryOpts`, mirroring `ReadRegistryV2Opts` at `schema-v2.ts:73-74`. | ✅ APPLIED — `read.ts` lines 28-29 (`logger?: { error: ... }`); forwarded to helper at line 64. KNOWN. |

The Q-F1 invariant is the load-bearing decision. R2 probe explicitly
exercises it: two consecutive `readRegistry` calls on a non-existent
path with mutation between calls; second call's `sessions` must
remain empty. **If R2 fails after WB2, there is a bug in the binding**
(per operator brief). Verified GREEN at WB2 commit `c361b78`.

---

## §3 Probes ran (8 new probes)

8 probes in `packages/dispatch-core/test/unit/registry-read-recovery.test.ts`:

| Probe | Coverage | WB1 (RED) | WB2 (GREEN) |
|---|---|---|---|
| **R1** | Behavior-preservation pin: pinned EXPECTED_BYTES round-trips to FIXTURE Registry (`.passthrough()` invariant) | ✅ pass | ✅ pass |
| **R2** | ENOENT default + fresh-object isolation across calls (Q-F1 invariant) | ✅ pass | ✅ pass |
| **R3** | Corrupt JSON + default opts → rejects with path-naming Error | ✅ pass | ✅ pass |
| **R4** | Schema-fail + default opts → rejects with path-naming Error | ✅ pass | ✅ pass |
| **R5** | Corrupt JSON + `onCorrupt:'quarantine'` → returns empty + sidecar created | ❌ fail (current code throws) | ✅ pass |
| **R6** | Schema-fail + `onCorrupt:'quarantine'` → returns empty + sidecar created | ❌ fail | ✅ pass |
| **R7** | ENOENT + `onCorrupt:'quarantine'` → returns empty + NO sidecar | ✅ pass (alignment with current ENOENT) | ✅ pass |
| **R8** | Forensic preservation: sidecar bytes byte-equal pre-quarantine corrupt bytes | ❌ fail | ✅ pass |

**WB1 observed**: 5 pass + 3 fail (operator brief expected 4+4).
Surfaced transparently in WB1 commit `c9815f7`. The deviation is
explained by R7's ENOENT semantic being shared between current code
and the post-WB2 helper-delegated form — kept as a deliberate
alignment pin rather than a fail-now signal.

**WB2 observed**: 8/8 pass. Confidence: KNOWN (test output
captured in WB2 commit `c361b78`).

---

## §4 Ladder commits

| WB | SHA | Stem |
|---|---|---|
| **WB1** | `c9815f7` | `red(MB-F-CORE-READ-RECOVERY-OPT-IN): WB1 — registry-read-recovery probes` |
| **WB2** | `c361b78` | `green(MB-F-CORE-READ-RECOVERY-OPT-IN): WB2 — readRegistry delegates to readJsonWithRecovery` |
| **WB3** | `061f704` | `green(MB-F-CORE-READ-RECOVERY-OPT-IN): WB3 — regression sweep (dispatch-core + dispatch-cli + dispatch-daemon)` |
| **WB4** | (this commit) | `refactor(MB-F-CORE-READ-RECOVERY-OPT-IN): WB4 — REPORT.md aggregate` |
| **WB5** | (next commit) | `docs(MB-F-CORE-READ-RECOVERY-OPT-IN): WB5 — sess-f finding entry` |

Per-commit-push discipline observed throughout. Per-path `git add
<path>` (no `git add -A`). Self-check block in every commit body
per CONDUCTOR_API_CONTRACT.md §10.5. Confidence labels (KNOWN /
MODELED / SPECULATIVE) on every factual claim.

---

## §5 What this defends against

**Three regression vectors locked in:**

1. **Silent behavior drift across the read surface** — R1 byte-stability
   pin reuses sess-a's WB4 fixture verbatim. Any drift in JSON-shape
   acceptance, `.passthrough()` field handling, or v2-on-disk
   transparency (DAEMON-Z-4 invariant) trips R1 immediately. KNOWN.

2. **Reference-aliasing pollution of the empty-registry shape** — R2
   probe explicitly tests the fresh-object invariant (Q-F1). If a
   future refactor introduces a shared `EMPTY_REGISTRY` constant and
   binds it as `emptyValue` directly (instead of inlining a literal),
   R2 trips. The hazard is real: `dispatch-cli/src/commands/init.ts:36`
   mutates `registry.sessions` in place; a shared constant would have
   leaked one fd command's session-add into a subsequent fd command's
   view of "empty" registry. KNOWN (the pre-refactor read.ts:18-21
   comment explicitly documents this exact incident).

3. **Merged-error-wording vs path-preservation** — R3/R4 probes pin
   the contract that the rethrow path's Error message must contain
   the file path verbatim, regardless of whether the underlying
   failure is JSON.parse or schema-validate. Helper's wording-shift
   (Q-F2) is observable but does not break this contract. Operator
   stderr UX preserved. KNOWN.

**Plus the new opt-in surface itself:**

4. R5 + R6 + R7 + R8 collectively pin the `onCorrupt:'quarantine'`
   surface — return value === empty registry, sidecar at correct
   path, target replaced with canonical empty JSON, sidecar bytes
   preserved verbatim. Forensic invariant preserved. KNOWN.

---

## §6 What this does NOT do

This batch is **read-side recovery surface only**. Out of scope:

- **No v2 daemon path change.** `readRegistryV2` at
  `dispatch-daemon/src/migration/schema-v2.ts` already delegates to
  `readJsonWithRecovery` (sess-a's batch-4 wiring at WB6). No
  modification to dispatch-daemon source in this batch.
- **No schema modification.** `RegistrySchema` and `SessionSchema`
  in `dispatch-core/src/registry/schema.ts` are FROZEN per scaffold
  (`Q-F1` brief: schema.ts FORBIDDEN). DAEMON-Z-4 `.passthrough()`
  preserved.
- **No persist/* helper modification.** Sess-a's batch-4 territory.
  This batch consumes the helper at the v1 binding site only.
- **No fd CLI default behavior change.** All 5 fd CLI call sites
  (`init.ts:22`, `status.tsx:108`, `send.ts:26`, `list.ts:15`,
  `pull.ts:33`) pass no opts → default `onCorrupt:'rethrow'` →
  identical observable behavior to pre-WB2. fd CLI users see no
  difference unless they hand-edit the sessions.json into corrupt
  bytes (in which case error wording shifts per Q-F2; functional
  contract identical).
- **No quarantine-by-default for v1 callers.** Quarantine is
  strictly opt-in. v2 daemon is the only caller using
  `onCorrupt:'quarantine'` today (at startup). This batch makes the
  capability available to future v1 callers but enables it nowhere.
- **No fix for the sess-c concurrent-writer race**
  (`MB-F-DAEMON-CONCURRENT-RACE-FIX`, deferred). Sess-f's read-side
  recovery handles single-writer-corruption events; sess-c's race
  is a multi-writer protocol-level issue independent of recovery
  semantics.

---

## §7 §G gaps surfaced (Phase 1 + Phase 2)

From Phase 1 (`/tmp/sess-f-core-read-recovery-diagnose.md`):

- **G1 — fresh-object vs shared-constant on ENOENT (resolved by Q-F1)**.
  Inline literal at the binding call site. Pinned by R2.
- **G2 — error-message wording shift (resolved by Q-F2).** Helper's
  merged wording accepted; documented in §2.
- **G3 — writeOpts always provided even when onCorrupt='rethrow'**.
  Helper line 86 only invokes writeAtomicJson on quarantine; no
  overhead on rethrow path. Defensive against future helper
  refactors. Documented in WB2 commit.
- **G4 — EMPTY_REGISTRY DRY follow-up (deferred).** Schema.ts
  remains frozen; not addressed this batch. Surfaced as a Tier-3
  followup in WB5 sess-f finding entry.
- **G5 — path-only first-arg signature backward compat**. KNOWN;
  verified at all 5 fd CLI call sites.
- **G6 — passthrough fields and validate semantics**. KNOWN; R1
  probe pins `.passthrough()` invariant on read side.

From Phase 2 execution:

- **G7 — pre-existing dispatch-daemon `install-paths.test.ts` P3
  failure**. Worktree path `sess-f-core-read-recovery` doesn't
  match the test's `/foxworks-dispatch$/` regex. Structural to
  worktree naming convention. Identical failure at HEAD `1098ebb`
  in any sess-* worktree. NOT a regression; flagged for operator
  awareness. Out of scope (FORBIDDEN: dispatch-daemon source).
  KNOWN.
- **G8 — WB1 RED count was 5+3 (not 4+4 as brief expected)**. R7
  passes against current code because ENOENT semantic is shared
  between pre-WB2 and post-WB2 paths. Surfaced transparently in
  WB1 commit body; deliberate alignment-pin design rather than
  fail-now signal. KNOWN.

---

## §8 Operator next steps

1. **Review this REPORT** + WB5 sess-f finding entry.
2. **Merge sess-f/core-read-recovery → main**. No fd CLI behavior
   change for end users (default `rethrow` preserves current). The
   `onCorrupt:'quarantine'` surface becomes available for future
   opt-in callers but is enabled nowhere this batch.
3. **Optional follow-up tickets** (deferred, NOT this batch):
   - `MB-F-CORE-EMPTY-REGISTRY-EXPORT` (Tier-3 SPECULATIVE) — if
     `schema.ts` ever unfreezes, consider exporting an
     `EMPTY_REGISTRY_V1` constant + cloning at use sites. Currently
     blocked by frozen-schema scaffold.
   - `MB-F-DAEMON-CONCURRENT-RACE-FIX` (Tier-2, deferred). Sess-c's
     finding #145 documents the race; sess-f's read recovery is
     independent of that work.
   - `MB-F-DAEMON-INSTALL-PATHS-WORKTREE-AWARE` (Tier-3,
     SPECULATIVE) — adapt `install-paths.test.ts` regex to accept
     worktree directories cut under `foxworks-worktrees/`. Not in
     sess-f territory.
4. **No action required on dispatch-cli call sites**. Backward
   compat is the design point; existing five-call-site footprint
   continues to work without modification. Future opt-in callers
   (e.g., a future `fd recover` command) can pass
   `{ onCorrupt: 'quarantine' }` to enable the new surface.

---

**Confidence summary** — every factual claim above is **KNOWN**
unless explicitly labeled SPECULATIVE. Test results captured in
WB1/WB2/WB3 commit bodies; ladder commit SHAs are reproducible.

**End of REPORT.**
