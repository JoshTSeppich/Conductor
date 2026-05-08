# MB-T27 Phase 1 Diagnose — Model mix indicator

**Terminal:** D (parallel-cairn 4-session run)
**Date:** 2026-05-07
**Working tree:** `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch` (main, clean)
**Origin parity:** HEAD = `934c0a8` (MB-T19 WB5 docs); `git log origin/main..HEAD` empty.
**Companion:** `docs/coordination/mb-t27-decisions-2026-05-07.md` (operator-skim review surface; tentative dispositions PENDING operator markup).

Inventory of the surface, decisions, risks, and ladder shape for MB-T27. Source of truth on dispositions = decisions doc. This file = full prose + verification trail.

---

## I. Ticket scope (operator prompt)

> **MB-T27** — Model mix indicator. Render the MixIndicator from the wireframe: per-model session count chips (S4.6/O4.6/O4.7·1M/H). Reads session list, groups by model field, displays counts. Out of scope: model routing rule editor.
>
> **Acceptance:**
> - Indicator updates within 1s of session spawn/kill
> - Counts accurate against live session list
> - Renders with zero-state (all zeros visible, not collapsed)
>
> **Realistic ladder:** 2-3 WBs.

Operator-prompt-stated open questions:
- **Q-MBT27-1**: where does the mix indicator live in the chat-shell header? (likely adjacent to cost meter and plan-usage ring slot per wireframe)
- **Q-MBT27-2 (implicit)**: session list source — existing `TileGridSessionEntry[]` passthrough vs new daemon-derived list (operator recommendation: existing TileGridSessionEntry[] — minimal coupling)

---

## II. Surface inventory (verified via tool reads)

### II-A. Existing chat-shell shape (MB-T20)
- `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (42 lines): tab-host `<ChatShell>` component. **Has NO header bar.** Top-level `<div data-testid="chat-shell-root">` contains:
  1. `<div data-testid="chat-shell-tab-strip" role="tablist">` — single Chat tab button.
  2. `<div data-testid="chat-shell-tab-content" role="tabpanel">` — renders `renderChatTab()`.
- Props: `{ renderChatTab?: () => ReactNode }`.
- **No `headerSlot` / `renderModelMixSlot` / `renderCostMeterSlot` props exist yet.** Adding header chrome = structural edit to chat-shell.tsx.

### II-B. Mount path (MB-T20 WB4)
- `packages/dispatch-workstation/src/chat-shell/mount.ts` (100 lines): mounts `<ChatShell>` into `workstation-shell.html#chat-region #root` via auto-mount block gated on `window.coarchitectBridge`.
- Bridge: `coarchitectBridge` only (Q-MBT20-5=a). **No `workstationBridge` reference yet** in mount.ts.
- `workstationBridge.onSpawnResult` is exposed on `window.workstationBridge` (preload.mts:55) — same window as chat-shell, accessible via `window.workstationBridge?.onSpawnResult`.

### II-C. Bridge surface (preload.mts:51-118)
- `workstationBridge.onSpawnResult(cb)` → returns cleanup; fires for spawn-result envelopes from main.
- **No `workstationBridge.onSessionsListUpdated`, `onSessionKilled`, or `getSessionsList`.** Main process broadcasts spawns but NOT kills.
- `workstationBridge.killSession(payload)` is renderer→main invoke; the renderer that invoked knows. Other renderers in same window do NOT learn (no broadcast event).

### II-D. TileGridSessionEntry — model field flow
- Defined `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:29-52`. Optional `model?: string` field present (added MB-T15).
- Usage: tile-header.tsx:137 reads `model` for the model chip; defaults to `'claude-sonnet-4-6'` (Q-MBT15-2 stub) when undefined.
- **`SpawnSuccessReply` type guard in tile-grid-app.tsx:114-134 validates only `{sessionName, cwd}`** — `model` is NOT extracted from the spawn-result envelope. Even tile-grid renders with `model=undefined` for all live sessions; tile-header falls back to the `claude-sonnet-4-6` default.
- Spawn-handler (`spawn-handler.ts:387-393`) returns `{sessionName, sessionId, panelMounted, cwd}` only — model is NOT in the spawn envelope at the server boundary either.
- **Implication:** in v3.0 production today, every live session has `model=undefined` from the renderer's perspective. A model-grouping indicator that reads `entry.model` produces:
  - Without default mapping: all sessions ungrouped → all chips at 0 even when N sessions are live.
  - With default mapping (treat undefined as `'claude-sonnet-4-6'`): all sessions counted under S4.6.

### II-E. modelChipShortcode helper (color-helpers.ts:62-70)
- Pure-fn `modelChipShortcode(sdkName: string): 'S4.6' | 'O4.6' | 'O4.7·1M' | 'H' | null`. Reusable as the grouping function for MixIndicator. Already covered by MB-T15 unit tests; no schema changes needed.
- `ModelChip` type already exported from `color-helpers.ts:18`.

### II-F. Cross-renderer state
- chat-shell renderer and tile-grid renderer mount into different `<div>`s in `workstation-shell.html` but live in the **same window**. They are separate React roots; cannot share `useState`.
- Communication options:
  1. Both subscribe to `workstationBridge.onSpawnResult` independently (each maintains its own copy of the session list). Spawn updates work; kill updates do NOT propagate without a new IPC channel.
  2. Add new IPC `workstation:sessions-updated` broadcast from main → all renderers in window. Requires preload.mts edit + main.ts wiring.
  3. Use a shared `window.__sessionListStore` global (DOM-level state). Hacky; not cairn-clean.
  4. DOM `BroadcastChannel`. Same-window broadcast; no preload changes. Less common but functional.
- **Operator's stated recommendation: existing TileGridSessionEntry[] passthrough — minimal coupling.** This implies (1) for now + accept that kill events do not flow into the mix indicator until a future ticket wires kill-broadcast IPC. The mix indicator updates on spawn (within ms) + on render whenever its prop changes. Kill-acceptance requires either (2) or scope-relaxation.

### II-G. Parallel-cairn chat-shell territory (Terminal C overlap)
- Terminal C is shipping **MB-T26 cost meter** in the same chat-shell header bar region.
- Both T26 + T27 need to add header chrome to `chat-shell.tsx`.
- No T26 diagnose / decisions / coordination doc visible at session start (`ls /tmp/mb-t26*` empty; `docs/coordination/` has no T26 file).
- **Shared-file risk: `chat-shell.tsx`.** Both sessions add a `headerSlot`-style render-prop or named slots.

---

## III. Open questions (Q-MBT27-N)

| ID | Question | Options | Tentative |
|---|---|---|---|
| **Q-MBT27-1** | Where in chat-shell does the mix indicator render? | (a) NEW header bar `<div data-testid="chat-shell-header">` ABOVE tab strip with named slots / (b) inline within tab strip / (c) overlay floating element | **(a)** |
| **Q-MBT27-2** | Slot pattern in ChatShell for T27 + T26 (parallel-cairn coordination) | (a) discrete named slot props (`renderModelMixSlot`, `renderCostMeterSlot` — each session adds its own prop) / (b) generic `renderHeaderSlot` (one prop, shared) / (c) children-array | **(a)** |
| **Q-MBT27-3** | Session list source | (a) chat-shell mount subscribes to `workstationBridge.onSpawnResult` and maintains local `TileGridSessionEntry[]` / (b) new IPC `onSessionsListUpdated` from main / (c) daemon `/v3/sessions` query | **(a)** |
| **Q-MBT27-4** | Kill-event coverage (acceptance: "updates within 1s of kill") | (a) accept gap — file v3.1 followup + smoke in zero-state / (b) add `onSessionKilled` IPC channel in this ticket / (c) MB-T27 scope-relaxation: remove "kill" from acceptance | **(a)** |
| **Q-MBT27-5** | Treatment of `model=undefined` (live sessions today) | (a) count under "unknown" bucket (NOT shown in chips; chips at 0 for all) / (b) default to `'claude-sonnet-4-6'` → S4.6 chip / (c) show all chips at 0 + a subtle "N sessions w/ unknown model" sub-line | **(a)** |
| **Q-MBT27-6** | New directory naming | (a) component lives at `packages/dispatch-workstation/src/chat-shell/mix-indicator.tsx` / (b) new `chat-shell-meters/` directory / (c) shared `chat-shell/header-meters/` co-located with T26 | **(a)** |
| **Q-MBT27-7** | data-testid contract | (a) `mix-indicator-root` outer + `mix-indicator-chip-S46` / `-O46` / `-O471M` / `-H` per chip / (b) chip composite `mix-indicator-chips` + per-chip role | **(a)** |
| **Q-MBT27-8** | WB count | (a) 3 (red → green render → green wiring + docs) / (b) 2 (combine into single red+green, docs as part of WB2) | **(a)** |
| **Q-MBT27-9** | Closes any existing followup? | (a) none (MB-T27 is wireframe-led) / (b) closes MB-F-T15-MODEL-CHIP-DEFAULT (if surfaces) | **(a)** |
| **Q-MBT27-10** | tsconfig.json + package.json shared-file edits | (a) skip (no new file paths land outside chat-shell/, already in tsconfig) / (b) append mix-indicator.tsx to exclude array | **(a) check actual** — chat-shell directory is already covered by tsconfig pattern; verify at WB1 via `cat tsconfig.json` |

**Q-MBT27-1 sub-rationale:** wireframe places the meter row above tabs as a stable header bar. Inline-in-tab-strip would crowd the tab buttons; overlay would clip when the chat panel resizes.

**Q-MBT27-2 sub-rationale:** discrete named slots minimize Terminal C ↔ Terminal D collision surface. Each session adds ONE prop; the chat-shell.tsx structural edit is "add header bar with both slot positions" — done by whichever session lands first; the second session adds only its own slot prop. Per-path git add + sentinel discipline applies.

**Q-MBT27-3 sub-rationale:** matches operator's "minimal coupling" recommendation. Spawn events are ~immediate via existing IPC; no new contract surface.

**Q-MBT27-4 sub-rationale:** kill-event coverage requires NEW IPC infrastructure (preload + main + frozen-contract-adjacent handler). Out of scope for a 2-3 WB ticket. Acceptance "updates within 1s of kill" is honestly NOT met in v3.0 ship; the indicator updates on the next chat-shell remount or refresh. File `MB-F-T27-KILL-EVENT-PROPAGATION` (Tier 2 v3.1) per MB-T19 precedent of "Capability enabled with known limitations."

**Q-MBT27-5 sub-rationale:** counting under "unknown" bucket avoids inflating S4.6 with sessions whose model isn't actually known. The chip set still renders at zero — meeting the zero-state acceptance — and the operator can read the wireframe-truth count once `model` is plumbed end-to-end (likely MB-T34/T35 reasoning loop ticket). Filing `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN` (Tier 2) captures the gap.

---

## IV. Risks (R-MBT27-N)

| ID | Risk | Severity | Disposition |
|---|---|---|---|
| **R-MBT27-1** | Shared-file conflict on chat-shell.tsx with Terminal C (MB-T26 cost meter) | HIGH | **MITIGATE via Q-MBT27-2=a + cross-session note + per-path git add.** Whoever lands header-bar structural edit first writes a small sentinel; second session adds slot-prop only. |
| **R-MBT27-2** | Frozen contract crossing (preload.mts changes if Q-MBT27-3=b) | ZERO under (a) / MEDIUM under (b) | **AVOID via Q-MBT27-3=a — preload.mts UNCHANGED.** |
| **R-MBT27-3** | Kill-event coverage gap (Q-MBT27-4=a) means acceptance not literally met for "kill" half | MEDIUM | **ACCEPT with operator-confirmed scope-relaxation + Tier 2 followup.** Cairn-honest framing per CLAUDE.md §2.11: "Capability enabled with known limitations." |
| **R-MBT27-4** | model=undefined for all live sessions today (II-D) → indicator renders all chips at 0 even when N>0 sessions are live | LOW (zero-state IS the acceptance) / would-be-HIGH if "counts accurate" interpreted strictly | **ACCEPT — counts ARE accurate against the model field as currently populated.** Filing MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN. |
| **R-MBT27-5** | dispatch-core dist rebuild (CLAUDE.md §3.4) | ZERO | **NO SCHEMA SPINE INGRESS** — all changes in workstation/chat-shell. |
| **R-MBT27-6** | Runtime-launch smoke as merge gate (CLAUDE.md §4.6) | HIGH if skipped | **WB2 OR WB3 RUNS SMOKE** — observe `WINDOW_READY` + `RENDER_OK` ≤10s after final renderer bundle. |
| **R-MBT27-7** | Test directory layout per CLAUDE.md §3.6 | ZERO | New tests at `packages/dispatch-workstation/test/unit/chat-shell-mix-indicator/probe-NN-*.spec.tsx`. |
| **R-MBT27-8** | esbuild script (per CLAUDE.md §3.7) | ZERO | mix-indicator co-bundled with chat-shell mount; existing `scripts/build-chat-shell.mjs` covers it (mix-indicator.tsx imported by chat-shell.tsx; bundle entry unchanged). |
| **R-MBT27-9** | Pre-existing test failures (CLAUDE.md §4.5) | ZERO new | **NOT RE-DIAGNOSED.** Note in WB3 docs surface as expected. |
| **R-MBT27-10** | Cross-session origin advance during ladder | LOW (MB-T20 precedent: stash + rebase clean) | **PER WB: `git pull --ff-only`** at top of atomic-chain commit. |

---

## V. Tentative WB ladder (Q-MBT27-8=a)

Per operator prompt: 2-3 WBs, smallest of the four. Tentative shape under all (a) dispositions:

| WB | Type | Scope | Tests authored | Files touched |
|---|---|---|---|---|
| **Phase 1** | spike | This diagnose + decisions doc + operator HALT 0 ack | n/a | `/tmp/mb-t27-diagnose.md`, `docs/coordination/mb-t27-decisions-2026-05-07.md` |
| **WB1** | red | Scaffold `mix-indicator.tsx` (empty stub) + `probe-01-mix-indicator-render.spec.tsx` (failing tests for chip render + count grouping + zero-state) | 4-6 red | `src/chat-shell/mix-indicator.tsx` (new), `test/unit/chat-shell-mix-indicator/probe-01-*.spec.tsx` (new) |
| **WB2** | green | Implement `MixIndicator` pure component (reuses `modelChipShortcode`); add `headerSlot` zone to `chat-shell.tsx` (or named slot pattern per Q-MBT27-2); wire `mountChatShell` to subscribe `onSpawnResult` + maintain session list + pass to `MixIndicator` via slot. Runtime smoke. | all green | `src/chat-shell/mix-indicator.tsx`, `src/chat-shell/chat-shell.tsx`, `src/chat-shell/mount.ts`, `test/unit/chat-shell-mix-indicator/probe-01-*.spec.tsx`, plus `test/unit/chat-shell/probe-02-mount-adapter-tests.spec.tsx` (extended) |
| **WB3** | docs | Findings doc + 1-2 v3.1 followups (kill-event propagation, model-field plumb-from-spawn) + outcome classification | n/a | `docs/coordination/mb-t27-findings-2026-05-07.md`, `docs/FOLLOWUPS.md` |

Plausible split: if Terminal C lands MB-T26 first with the header bar already structurally added + a `renderCostMeterSlot`, MB-T27 WB2 collapses to "add `renderModelMixSlot` prop + slot-position usage" — even smaller. The cross-session note at HALT 0 should pre-arbitrate this with Terminal C.

---

## VI. Cross-session coordination (Terminal C, MB-T26)

- **Pre-coordination need:** chat-shell.tsx header bar structural edit. Two paths:
  - **Sequence:** wait for Terminal C to land MB-T26 WB2 with header bar + `renderCostMeterSlot`; MB-T27 WB2 then adds only `renderModelMixSlot` prop.
  - **Independent:** both sessions assume the OTHER will not land header structural edit; whichever commits first does the structural work. Risk: rebase conflict on chat-shell.tsx.

**Recommendation at HALT 0:** operator coordinates with Terminal C. Suggest:
1. Terminal C (MB-T26) lands the header bar `<div data-testid="chat-shell-header">` structural edit + their `renderCostMeterSlot`. Cairn-clean.
2. Terminal D (MB-T27) rebases over Terminal C's commits, adds `renderModelMixSlot` to existing header bar.

Alternatively, if MB-T26 is also at HALT 0 and not committed yet, write a coordination note `docs/coordination/mb-t26-mb-t27-chat-shell-header-coord-2026-05-07.md` agreeing on:
- header bar testid contract
- slot prop names (renderCostMeterSlot, renderModelMixSlot)
- which session lands the structural edit

**Assertion at HALT 0 surface:** Phase 1 commits NO code yet — only diagnose + decisions docs. Header bar lands at WB2.

---

## VII. Verification trail (KNOWN, this session)

| Claim | Evidence |
|---|---|
| chat-shell has no header bar | Read `src/chat-shell/chat-shell.tsx` (42 lines, full) |
| TileGridSessionEntry has model?: string | Read `src/tile-grid/tile-grid.tsx:29-52` |
| `modelChipShortcode` returns S4.6/O4.6/O4.7·1M/H | Read `src/tile-grid/color-helpers.ts:62-70` |
| spawn-handler does NOT return model | Read `src/main/spawn-handler.ts:387-393` |
| SpawnSuccessReply guard validates only sessionName + cwd | Read `src/tile-grid/tile-grid-app.tsx:114-134` |
| workstationBridge has onSpawnResult; no onSessionKilled | Read `src/main/preload.mts:51-118` |
| no T26 coord doc on disk | `ls docs/coordination/` (no mb-t26-*) + `ls /tmp/mb-t26*` (empty) |
| origin parity | `git log origin/main..HEAD` empty; `git status --short` empty |

**MODELED claims:**
- Cross-renderer kill propagation requires either new IPC or BroadcastChannel — based on read of preload.mts + reasoning about React-root boundaries; not directly tested.
- MB-T26 (Terminal C) will need the same header-bar structural edit — based on operator prompt's "same chat-shell header bar region" + wireframe placement of cost meter; not directly verified.

**SPECULATIVE claims:**
- model field will be plumbed from spawn-result in MB-T34/T35 — no current ticket reserves this. Could land in any future ticket touching anthropic-client + spawn-handler.

---

## VIII. HALT 0 surface to operator

Awaiting:
1. Q-MBT27-1..10 disposition acks/flips
2. R-MBT27-1..10 disposition acks
3. WB ladder shape ack (3 WBs vs alternative)
4. Terminal C coordination strategy: sequence MB-T26 first, OR pre-arbitrate header bar structural edit via cross-session note
5. Confirmation that the kill-event propagation gap (R-MBT27-3) is acceptable with v3.1 followup, OR that scope expansion to add the IPC channel is preferred (would push ticket to 4-5 WBs)

Phase 1 commits NO code; once HALT 0 returns ack, commit `spike(MB-T27): Phase 1 diagnose + decisions doc` and proceed to WB1 red.
