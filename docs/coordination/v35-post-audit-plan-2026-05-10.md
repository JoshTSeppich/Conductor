# v3.5 Post-Audit Execution Plan

**Date:** 2026-05-10
**Authored:** CC session, post-wireframe-audit (HEAD `9e72e8f`), Opus 4.7 substrate
**Anchored against:**
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` (audit, 542 lines, ratified)
- `~/Downloads/conductor/project/wireframes.jsx` (wireframe canonical, 601 lines)
- `~/Downloads/wireframe-tickets-inventory.md` (inventory, 536 lines)
- `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` (HSO BUILD doc, 450 lines, RATIFIED)
- `~/Downloads/foxworks-project-instructions.md` + `~/Downloads/foxworks-portfolio-plan.md`

**Confidence labels per project-instructions §3:** `[KNOWN]` = observed in this session via tool read. `[MODELED]` = reasoned from observed facts plus a stated model. `[SPECULATIVE]` = hypothesis without direct evidence.

**Authoring posture:** Planning document only. No code execution, no commits, no ticket dispatch. Operator-arbitrated decisions (`§A`) gate downstream ticket authoring.

---

## §0 — Scope fence + track coupling

[KNOWN] v3.5 has two implementation tracks that share calendar and ship-gate but address orthogonal surfaces:

| Track | Source doc | Scope | Status |
|---|---|---|---|
| **HSO infrastructure** | `CONDUCTOR_V3.5_BUILD.md` | Hot-Swap Orchestrator architecture: pool, action-variant emission, swarm-state.md write protocol, peer-summary harvest, chat-panel PTY refactor | RATIFIED both spikes. MB-T36 closed at `a93ad74`. MB-T41 operator-only system prompt is the remaining gate; post-MB-T41, tickets MB-T35-revised + MB-T37 + MB-T38 + MB-T39 + MB-T40 fire per `CONDUCTOR_V3.5_BUILD.md §5` |
| **Wireframe-audit closures** | `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` | Chrome parity, data-model gaps, frame-layout architecture, ship recommendation | NOT YET ARBITRATED. 10 architectural calls open (§10); 3 ship options unselected (§12); 2 new findings filed (§9) |

[MODELED] **Track coupling.** The audit dispatch language ("post-audit v3.5 work") reads as if the two tracks are separable. They are not. Reading `wireframes.jsx:120-128` directly: the wireframe `CONDUCTOR_CHAT` data shows the Conductor parsing BUILD.md ("Loaded BUILD.md (rev 2dc6cea) — parsed 14 tasks, 6 blocked, 8 ready. Spawning 8 sessions now"), surfacing quick-pick decisions ("Hold until ready / Start speculatively / You decide"), and reasoning about cost caps. The ticket inventory `~/Downloads/wireframe-tickets-inventory.md:412-433` explicitly calls out MB-T34 (API client) + MB-T35 (reasoning loop) as the hard prerequisites for the wireframe Conductor's behavior. **HSO is the v3.5 implementation of MB-T34/T35 — the wireframe-author's autonomy assumption is what HSO ships.** The "BUILD.md tab" item in audit §10.3 is a cross-track item, not an audit-only item.

[KNOWN] **What this plan covers and does not cover:**
- **Covers:** audit §10 operator-decision items, audit §12 ship-recommendation reconciliation with HSO ship-gate (Q-V35-7), audit §9 finding-filing, sequencing across both tracks, dependency graph.
- **Does not cover:** authoring or modifying HSO §5 ticket bodies (those are pre-ratified pending MB-T41); authoring MB-T41 (operator-only); modifying any frozen surface; re-diagnosing pre-existing test failures per CLAUDE.md §4.5.

---

## §1 — Cross-doc reconciliation: where the audit and wireframe diverge

[KNOWN] Reading the wireframe directly (not via audit summary) surfaces three reconciliations the audit smoothed:

### §1.1 — Frame layout: audit-rec ≠ wireframe-author-rec

The audit (§10.1) recommends **"Accept three-region as v3.5 primary. File Frame C as v3.6 milestone."**

The wireframe canonical, `wireframes.jsx:570-571` FrameN:

> *"Ship **C (List + Detail)** as the primary mode — it scales to 16 sessions and stays readable. Offer **A (Dense Grid)** as a 'wall of cooking' view toggle. Skip B and D unless we want them later."*

[MODELED] These conflict. The audit's recommendation prioritizes scope-fence on a frozen v3.5 calendar; the wireframe-author's recommendation prioritizes design intent. Both are defensible, neither is mechanical. **Operator must arbitrate; the plan does not pre-resolve this in §A.1.**

### §1.2 — Conductor panel position is NOT an architectural mismatch

[KNOWN] Audit §5.A classifies "Conductor panel region" as ARCHITECTURAL-MISMATCH (wireframe: side-panel; shipped: bottom strip).

Wireframe direct evidence: `wireframes.jsx:372` `<FrameShell footer={<Conductor/>}>`, `:394` (same), `:445` (same). **Every FrameShell uses Conductor as a footer slot.** The shipped 280px `#chat-region` at the bottom of `#shell` (flex column) matches this pattern.

[MODELED] What IS mismatched is the Conductor *internal* header-bar layout — wireframe's `chead` (`wireframes.jsx:255-272`) places label + tabs + mode toggle + pills + cost meter + PlanRing in a single horizontal row alongside the tab strip; shipped `chat-shell-header-bar` is a separate `role=toolbar` div ABOVE the tab strip. That's the real Conductor-side mismatch. Position is correct.

**Consequence for plan:** audit §10.7 (PlanRing/MixIndicator placement) and "Conductor position" should not be conflated. Position is closed. Header-bar layout is the open question.

### §1.3 — Wireframe has PlanRing in TWO places, not one

[KNOWN] Audit §10.7 frames the question as "FrameShell global toolbar **vs** Conductor header-bar." Wireframe direct evidence:
- `wireframes.jsx:270` Conductor `chead`: `<PlanRing size={44}/>` (large ring with label)
- `wireframes.jsx:350` FrameShell `.toolbar`: `<PlanRing size={36} label={false}/>` (small ring, no label)

**Both rings exist in the wireframe simultaneously.** Same is NOT true for MixIndicator — `wireframes.jsx:347` puts MixIndicator only in the FrameShell toolbar, not in Conductor.

[MODELED] Audit §10.7's framing as a relocation choice is therefore wrong. The real question is: *add a second instance to the shell header-bar*, not *move*. This reframes §A.3 below.

---

## §A — Operator-only arbitration gates (BLOCK ticket authoring)

Each item lists: question, options with confidence-labeled rationale, downstream blocked work, cross-track dependencies.

### §A.1 — Frame layout target for v3.5

[KNOWN] Audit §10.1 + §1.1 reconciliation above.

**Question:** Which frame layout(s) define v3.5 wireframe parity?

| Option | Rationale | Effort | Downstream |
|---|---|---|---|
| **(1) Three-region permanent** | Audit-rec. Smallest scope. v3.5 ships current shell. Defers all four frames to v3.6. | 0 WBs for layout; chrome work proceeds in current architecture | Family A tickets (MB-T15/T18/T19) target current tiles; §10.4/§10.5/§10.8 wholly deferred |
| **(2) Frame-C-primary + A toggle** | Wireframe-author-rec (FrameN). Top-of-shell tab-strip switches between Frame A (current dense grid) and Frame C (list+detail). Frame B/D skipped. | ~12-16 WBs across 4 tickets (router, Frame C surface, detail-pane actions, compact-mode trim) | Family A tickets repurpose for both A and C surfaces; tab-strip enables future §10.4/§10.5/§10.8 in toolbar slots |
| **(3) Full A/B/C/D switching** | Maximalist. All four frames + FrameN notes. | ~20-28 WBs across 6-7 tickets | Same as (2) plus Frame B (hero promote-on-click) + Frame D (ASCII reference, cosmetic-only) + FrameN (operator-facing notes surface) |

[MODELED] **Recommended direction:** (2). The wireframe-author's reasoning at `wireframes.jsx:570-571` is load-bearing — Frame C is the only layout that scales to 16 sessions and stays readable. The audit's (1) preserves scope-fence but ships v3.5 without the wireframe-author's primary design intent. (3) over-builds Frame D (the wireframe-author calls it "reference-grade ... would be hard to actually use at scale" at `:539`) and Frame B (PARTIAL today via hero-squad layout, no UI affordance — `MB-F-T19-MUTATION-UI` Tier 2 already open). (2) is the middle path that ships the wireframe-author's primary recommendation without scope creep on the secondary frames.

**Cross-track dependency:** none. Frame layout is workstation-renderer territory; HSO is workstation-main + daemon territory. They can ship in any order.

**Downstream blocked by §A.1:** §A.3 (PlanRing/MixIndicator placement — option 3 of §A.3 requires §A.1 = (2) or (3) to give them a stable toolbar to live in), §C branches (§C.1 vs §C.1′ vs §C.2), §10.4 (shell-level pills — only meaningful with toolbar room) §10.5 (filter row — only meaningful in Frame C list view) §10.8 (in-page titlebar — only meaningful if frame-tab-strip occupies header-bar).

### §A.2 — Token source selection

[KNOWN] Audit §10.6. Three sub-options (a/b/c).

**Question:** Where does the token ratio (used / max-context) come from?

| Option | Mechanism | Effort | Risk |
|---|---|---|---|
| **(a) `cost_info.token_count / MODEL_CONTEXT_WINDOW`** | Use existing `SessionResponseV2.cost_info.token_count` (KNOWN absolute integer per v2 schema). New static lookup table model SKU → context-window max. ratio = absolute / max | Spike (model→context table ADR), then ~3-5 WBs per consumer | Model SKU list must stay current with Anthropic releases; stale table = silently wrong ratio |
| **(b) New daemon field `context_pct`** | Frozen-contract amendment. Daemon computes ratio server-side; new field in `SessionResponseV2`. | Operator-arbitrated contract amendment + ~4-6 WBs (daemon route + Zod schema + workstation consumer) | Touches v2 frozen schema spine — REGISTRY.md §2 territory per CLAUDE.md §1 |
| **(c) PTY scrape from CC CLI status output** | Parse `[0-9]+ tokens$` from PTY stream. Reuses SPIKE-HSO-01 infrastructure (already KNOWN-viable per `CONDUCTOR_V3.5_BUILD.md §3.4`) | Spike (extraction reliability on per-tile PTY, not just orchestrator), then ~4-6 WBs (PTY subscription + parser + IPC + denominator lookup) | Same model→context table dependency as (a); PTY format depends on CC CLI version |

[MODELED] **Recommended direction:** (a) for v3.5 if Anthropic SDK rate of release is low; (c) if HSO PTY-scrape infrastructure is already broadcasting token counts. (b) involves a frozen-contract amendment and downstream consumer cascade across all 5 packages — disproportionate scope unless other context-pct consumers are imminent.

**Cross-track dependency:** (c) reuses HSO `pty-stream-relay.ts` and SPIKE-HSO-01 evidence (per `CONDUCTOR_V3.5_BUILD.md §3.4` finding F9). If HSO Wave 1 already broadcasts token counts for orchestrator handoff trigger, the per-tile token meter consumes the same broadcast. **If §A.2 = (c), §C.5 spike scope shrinks.**

**Downstream blocked by §A.2:** `ctx N%` text wiring across 4 wireframe surfaces (Pane `wireframes.jsx:233`, Hero `:403`, Frame-C detail `:470`, Frame-C list-row `:458`); MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER closure is independent but the token-meter tints (`tbarClass(t) > 0.85 → danger`, `> 0.7 → warn` at `wireframes.jsx:165`) depend on a real ratio.

### §A.3 — PlanRing / MixIndicator placement

[KNOWN] Per §1.3 reconciliation: wireframe has PlanRing in BOTH FrameShell toolbar (36px) AND Conductor chead (44px). Audit §10.7's "pick one location" framing is wrong.

**Question:** Add the second PlanRing instance to `#header-bar`? Same for MixIndicator?

| Option | What changes | Effort |
|---|---|---|
| **(1) Status quo** | Conductor chead-only. Partial wireframe parity. | 0 WBs |
| **(2) Add 36px PlanRing + MixIndicator to `#header-bar`** | Full wireframe toolbar parity. Existing data sources (`coarchitect:rate-limit-update`, `MixIndicatorContainer`) feed both instances. | 2-3 WBs (shell-side renderer mount + bridge plumbing if needed) |
| **(3) Move-only to `#header-bar`, remove from Conductor chead** | Audit §10.7's framing. Requires §A.1 = (2) or (3) — otherwise the toolbar is too sparse to be the canonical location | Cosmetic CSS work — but depends on §A.1 first |

[MODELED] **Recommended direction:** (2). The wireframe-author chose dual placement deliberately — `wireframes.jsx:268-271` puts the large PlanRing in the Conductor's right-aligned slot alongside cost meter; `:350` puts a small unlabeled PlanRing in the FrameShell toolbar for at-a-glance monitoring above the frame body. They serve different glances. (1) ships partial wireframe parity for zero effort; (2) closes the gap with bounded scope; (3) requires §A.1 = (2) or (3) AND deletes a deliberate wireframe element.

**Cross-track dependency:** none. Both instances consume existing `coarchitectBridge.onRateLimitUpdate` push subscription; MixIndicator consumes existing model-mix store.

**Downstream blocked:** none load-bearing. Independent of other §A items.

### §A.4 — v3.5 ship-gate criteria

[KNOWN] Audit §12 offers three options (A/B/C); `CONDUCTOR_V3.5_BUILD.md §7 Q-V35-7` ratified HSO wireframe-operational criteria (60 minutes continuous orchestration; arbitrated 2026-05-08).

**Question A:** Audit §12 option selection — A (ship as-is), B (cheap cosmetic), C (cheap + one structural).

**Question B:** HSO 60-min (Q-V35-7 option a) or 120-min (Q-V35-7 option b)?

**Question C:** Single combined gate or two-gate split?

| Coupling | Definition | Operator burden |
|---|---|---|
| **Single gate** | v3.5 = HSO ship-criteria AND audit-track ship-criteria met together. One merge to main. | Higher: must finish both tracks before any ship signal. |
| **Two-gate split** | v3.5-alpha = HSO ship-criteria (autonomy works). v3.5 = HSO + audit-track. | Lower per-gate; clearer demarcation; matches portfolio-plan single-session-with-operator-review pattern |

[MODELED] **Recommended direction:** **two-gate split**, audit Option B, HSO 60-min for v3.5-alpha, HSO 120-min + audit Option C for v3.5 ship-confidence. Rationale: HSO is infrastructure that works or doesn't (binary). Chrome polish is incremental. Combining them into one gate means chrome bugs block infrastructure ship. Two-gate split also matches the portfolio-plan §5 pattern (clean stops between phases).

**Cross-track dependency:** §A.4 IS the cross-track integration point. Decision finalizes the §E checklist.

**Downstream blocked by §A.4:** all of §E.

---

## §B — Mechanical closures (no arbitration needed)

[MODELED] These three items have no §A dependencies. They can ship in parallel with §A arbitration without prejudicing any §A outcome.

### §B.1 — Tile-level visual separation (closes audit §10.2)

**Scope:** CSS-only change.
- Add border, border-radius, background to per-tile container.
- Add gap between tiles in `#tile-grid-root` (currently `display:block` with no gap per audit §4 evidence).
- No IPC changes, no data flow changes.

**Files touched [MODELED]:**
- `packages/dispatch-workstation/src/main/workstation-shell.html` — `#tile-grid-root` rule
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` — per-tile wrapper or CSS module
- Optionally `tile.tsx` if border lives on Tile component instead of grid

**Acceptance:**
- Visible border + radius on each tile at all auto-grid layouts (1×1 through 2×4+overflow)
- Gap between tiles renders consistently
- No regression in `MB-T12` tile-grid persistence (tile-grid-state.json layout, drag-resize, swap, detach)
- Visual smoke verification via workstation runtime launch per CLAUDE.md §4.6

**Cairn cycle:** red (visual snapshot probe) → green (CSS) → push. Single WB.

### §B.2 — Window title suffix (closes audit §10.9)

**Scope:** One-line change.
- `wireframes.jsx:340`: `Foxworks Workstation — Conductor`
- Current: `<title>Foxworks Workstation</title>` per `workstation-shell.html:5`

**Files touched [MODELED]:**
- `packages/dispatch-workstation/src/main/workstation-shell.html` `<title>` element
- OR `packages/dispatch-workstation/src/main/main.ts` via `mainWindow.setTitle()`

**Acceptance:**
- Window title reads "Foxworks Workstation — Conductor" in dock/title bar
- Smoke verification: launch workstation, observe window title

**Cairn cycle:** red (probe expecting title string) → green → push. Single WB.

### §B.3 — File 2 audit findings to FOLLOWUPS

[KNOWN] Per dispatch: "already in flight per separate dispatch."

**Findings to verify-don't-duplicate:**
- `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2) — audit §9
- `MB-F-AUDIT-IPC-SCHEMA-VALIDATION-UNIFORMITY` (Tier 3) — audit §9

**Action:** read `docs/FOLLOWUPS.md` head to confirm parallel dispatch landed both rows. If not landed, file. If landed, no action needed.

**Cross-track dependency:** none.

---

## §C — Conditional work (gated on §A arbitrations)

### §C.1 — IF §A.1 = (1) three-region permanent

[MODELED] **Tickets to author** (all consume current `#shell` three-region architecture):
- **MB-T15-followup-hex-colors** — close `MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER` Tier 2. Update `color-helpers.ts` model-chip palette from placeholder hex to wireframe `wireframes.jsx:200-204` `modelClass()` mapping (S / O46 / O47 / H). 2-3 WBs.
- **MB-T19-followup-mutation-ui** — close `MB-F-T19-MUTATION-UI` Tier 2. UI affordance to set `heroSessionName` in `tile-grid-state.json` without manual JSON edit + workstation restart. 4-5 WBs.
- **MB-T27-followup-model-plumb** — close `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN` + `MB-F-T27-KILL-EVENT-PROPAGATION` Tier 2 pair. Wire `model` field from `SpawnSessionResult` to TileGridApp + emit kill events to MixIndicatorContainer. 4-6 WBs.

**Deferred wholesale to v3.6:** §10.4 (shell pills), §10.5 (filter row), §10.8 (in-page titlebar). Filter row is data-model-blocked (per audit §5 — needs `status` + `repo` fields not in v2/v3 schema).

**Rough total:** 10-14 WBs.

### §C.1′ — IF §A.1 = (2) Frame-C-primary + A toggle

[MODELED] **Tickets to author** (sequenced; some parallel):

| # | Ticket | Scope | WBs | Parallelizable with |
|---|---|---|---|---|
| 1 | **Frame-router** | Top-of-shell tab strip (A / C). Shell-mode state field added to `tile-grid-state.json` (or sibling). Render dispatcher inside `#shell` selects `<TileGridApp mode="A"/>` vs `<FrameC/>`. | 3-4 | none (foundation) |
| 2 | **Frame C surface** | New `frame-c/` directory under `src/`. List column (consumes `TileGridSessionEntry[]` from MB-T12 store) + detail pane (consumes selected session). Selection state in shell-mode store. Tile-grid auto-mount-on-spawn behavior preserved by re-routing through Frame C selection. | 5-7 | ticket #3 after first render lands |
| 3 | **Detail-pane action footer** | `wireframes.jsx:482` shows `"kill · diff · merge · focus"`. Kill exists. New: diff (git diff against main), merge (git merge), focus (promote to hero — which in Frame-C-only world means "expand detail pane"). 3 new IPC channels. | 4-5 | ticket #4 after detail-pane shape lands |
| 4 | **Compact tile mode for Frame A** | `wireframes.jsx:239` `Pane(compact)` hides `pfoot`. Trim shipped Tile component to compact variant when shell-mode = A. Cosmetic delta. | 2-3 | sequential |

**Rough total:** 14-19 WBs. Wave 1 = ticket #1 (serial). Wave 2 = tickets #2 + #4 in parallel (different files). Wave 3 = ticket #3 after Frame C lands.

**Cross-track dependency:** Frame C detail-pane footer's "merge" action overlaps with potential future `MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX` (kanban currently consumes merge commits). Surface to operator at ticket-authoring time.

### §C.2 — IF §A.1 = (3) full A/B/C/D switching

[MODELED] §C.1′ items PLUS:

| # | Ticket | Scope | WBs |
|---|---|---|---|
| 5 | **Frame B hero+squad** | Promote-on-click affordance for `MB-F-T19-MUTATION-UI`. Hero-pane + squad-tile auto-shrink. Layout already partial per `tile-hero-squad-layout.ts`. | 4-6 |
| 6 | **Frame D ASCII reference** | Cosmetic-only — text-only rendering of session list as box-drawing chars. Useful for printouts per wireframe `:537-540`. Probably zero IPC; reads current session list. | 2-3 |
| 7 | **FrameN notes surface** | Operator-facing notes pane (`wireframes.jsx:546-575`). Markdown rendering of operator-authored notes. | 3-4 |

**Rough total:** 23-32 WBs. Significantly above ticket-inventory's 12-WB single-session ceiling per CLAUDE.md §4.1 — would split into multiple sessions.

### §C.3 — IF §A.2 = (a) `cost_info` ratio

[MODELED] **Spike + ticket:**

- **Spike:** model SKU → context-window max lookup. Confirm Anthropic SDK doesn't already export this; if not, hand-author static table + ADR.
- **Ticket: token-meter-wiring-cost-info.** Wire `SessionResponseV2.cost_info.token_count` from daemon → TileGridApp → TileHeader props. Compute ratio against static table. Update `tbarClass()` thresholds (`> 0.7` warn, `> 0.85` danger per `wireframes.jsx:165`). Add `ctx N%` text element to TileHeader. 4-6 WBs.

### §C.4 — IF §A.2 = (b) new daemon field

[MODELED] **Operator-arbitrated frozen-contract amendment + ticket:**

- **Amendment:** operator-only authoring of `context_pct` field addition to `SessionResponseV2` in `CONDUCTOR_API_CONTRACT.md`. Per CLAUDE.md §1 frozen-contract surfaces.
- **Ticket: token-meter-wiring-daemon-field.** Daemon route update emits `context_pct` per session. Workstation consumer updates Zod schema (mechanical translation per CLAUDE.md §1). TileHeader consumes new field directly. 5-7 WBs (split across daemon + workstation).

### §C.5 — IF §A.2 = (c) PTY scrape

[MODELED] **Spike + ticket:**

- **Spike:** extraction reliability on per-tile PTY (vs orchestrator-only PTY for SPIKE-HSO-01). CC CLI status-bar format may differ across substrate; verify same regex works for Sonnet 4.6 / Opus 4.7 / Haiku 4.5.
- **Ticket: token-meter-wiring-pty-scrape.** New per-tile PTY subscription (or reuse orchestrator-relay infrastructure broadcast). Parse token count. Combine with static model→context-window table (same as §C.3). 4-6 WBs.

**Effort delta:** if HSO Wave 1 already broadcasts token counts for handoff-trigger detection, §C.5 reuses that infrastructure; spike collapses to verification. Otherwise full spike.

### §C.6 — §10.3 BUILD.md tab (cross-track HSO dependency)

[KNOWN per audit §10.3 + `CONDUCTOR_V3.5_BUILD.md §5`] BUILD.md tab is the `mount.ts:65` "future MB-T23" placeholder. The wireframe's BUILD.md tab body (`wireframes.jsx:312-325`) renders `TASK_LIST` with `state in [done|run|block|todo]` per task.

**Cross-track dependency [MODELED]:** the wireframe's TASK_LIST shape (task name, sub-description, session attribution, state) is what HSO's swarm-state.md emits per peer session. Specifically:

| Wireframe TASK_LIST field | HSO source |
|---|---|
| `name`, `sub` | BUILD.md (operator-authored) — already shipped via MB-T28 parser |
| `state` | swarm-state.md (orchestrator-authored, MB-T38 ships writer) |
| `sess` | swarm-state.md per-peer session list |

**Conclusion:** BUILD.md tab in Conductor panel is NOT a standalone audit item. It's downstream of HSO Wave 1 (MB-T35-revised + MB-T38) + MB-T41 system prompt. Authoring the tab body before HSO ships means it has no data to render.

**Sequencing:** defer §10.3 BUILD.md tab authoring until HSO MB-T38 (swarm-state.md writer) lands. After MB-T38, BUILD.md tab is ~5-6 WBs per inventory MB-T23 spec.

### §C.7 — §10.4 / §10.5 / §10.8 deferred items

[MODELED] All three are predicated on §A.1 outcomes and data-model decisions:

- **§10.4 shell status pills** (bypass-perms, N/M running, max-plan): bypass-perms is per-tile data (already plumbed in TileFooter); shell-level pill would need a "any session has bypass-perms" reducer. N/M running needs session-count IPC channel. Max-plan text is HSO PlanRing's responsibility. **Defer to v3.6** unless §A.1 = (2) or (3) creates toolbar room.
- **§10.5 filter row**: data-model-blocked. `status` and `repo` are STUB/ARCHITECTURAL-MISMATCH per audit Dim 5. Without §A.2 resolution + a `repo` field source, filter row has nothing to filter on. **Defer to v3.6**.
- **§10.8 in-page titlebar**: Electron-specific complexity (titleBarStyle hiddenInset, cross-platform). "tmux · N panes · max-plan" right-side text requires session-count IPC (same dependency as §10.4). **Defer to v3.5.x or v3.6**.

---

## §D — Execution sequencing

### §D.1 — Per-cluster single-session vs parallel-CC analysis

[MODELED] Per portfolio-plan §6, realistic parallel-CC compression is 20-25%, concentrated in specific phases.

| Cluster | Cluster WBs | Single-session | Parallel-CC option | Compression |
|---|---|---|---|---|
| §B (mechanical) | 2-3 WBs (§B.1+§B.2 only; §B.3 is doc) | 1 short session | Not worth coordinating — too small | 0% |
| §A.1 = (1) → §C.1 | 10-14 WBs | 2-3 sessions sequential | T15-followup ‖ T19-followup ‖ T27-followup (3 sessions; distinct files) | ~30% (mirrors inventory Phase E parallelism) |
| §A.1 = (2) → §C.1′ | 14-19 WBs | 3-4 sessions sequential | Wave 2: ticket #2 ‖ ticket #4 after ticket #1 (router) lands | ~20% (router is serial bottleneck) |
| §A.1 = (3) → §C.2 | 23-32 WBs | 5-7 sessions | More parallel slots available; same router bottleneck | ~25% |
| §A.2 spike + ticket | 4-7 WBs | 1-2 sessions | Spike is serial; ticket can ship after spike-ratification | 0% |
| §C.6 BUILD.md tab | ~5-6 WBs | 1 session | Sequential post-HSO Wave 1 | 0% |
| HSO Wave 1 (MB-T35-revised + MB-T38) | per `CONDUCTOR_V3.5_BUILD.md §8` ~2-4 hrs each | 1-2 sessions | Already specced parallel in BUILD doc §8 Pattern α window 2 | 20-25% per BUILD doc estimate |

[MODELED] **Parallelism honest framing per CLAUDE.md §9 (never claim "Improved" without evidence):** §B + §A.1 = (1) + HSO Wave 1 could run as a 3-track parallel-CC sprint with operator review at every commit. The §B track is short enough to ship before §A arbitration completes — useful as a "show progress while operator decides §A" pattern. §A.2 spike can run alongside.

### §D.2 — Realistic compression estimate

[MODELED] **Compression depends on §A.1 outcome:**

- §A.1 = (1) three-region: §C.1 has highest parallel value (~30%). Total v3.5 audit-closure track: ~15-22 WBs ≈ 4-6 sessions with operator review.
- §A.1 = (2) Frame-C-primary: §C.1′ has bounded parallel value (~20%). Total: ~18-25 WBs ≈ 5-7 sessions.
- §A.1 = (3) full frames: §C.2 has moderate parallel value (~25%). Total: ~25-35 WBs ≈ 7-10 sessions.

HSO track wall-clock per `CONDUCTOR_V3.5_BUILD.md §8`: ~7-13 hours focused operator runway after MB-T41 lands.

[MODELED] **Combined v3.5 ship-gate calendar (two-gate split per §A.4 recommendation):**
- v3.5-alpha (HSO ship): ~7-13 hours focused = 2-3 days at sustained operator review pace
- v3.5 ship (HSO + audit-track Option B/C): adds 4-10 additional sessions depending on §A.1, ~1-2.5 weeks at sustained pace

This matches portfolio-plan §5.1 "~1-2 weeks of focused work" budget for a phase of this size.

### §D.3 — Dependency graph

[MODELED]

```
                   MB-T41 (operator-only)
                          │
                          ▼
       ┌─────── HSO Wave 1: MB-T35-revised + MB-T38 ────────┐
       │                                                      │
       ▼                                                      ▼
HSO Wave 2: MB-T37 + MB-T39                          §C.6 BUILD.md tab
       │
       ▼
HSO Wave 3: MB-T40
       │
       ▼
HSO dogfood validation (Q-V35-7)


§B closures (independent, no §A dependency)
   §B.1 tile visual separation ─────┐
   §B.2 window title suffix ────────┼─► v3.5 audit-track Option B ✓
   §B.3 file 2 findings ────────────┘


§A.1 decision ───────► branches §C.1 / §C.1′ / §C.2
        │
        └──► §A.3 option (3) gated here

§A.2 decision ───────► branches §C.3 / §C.4 / §C.5
        │                           │
        │ option (c) reuses HSO PTY infra  ─── back-edge to HSO
        │
        └──► ctx N% text wiring across all §A.1 surfaces

§A.4 decision ───────► §E checklist finalization
```

**Critical path to v3.5 ship (under recommended §A.4 = two-gate split):**
1. v3.5-alpha = MB-T41 → HSO Wave 1-3 → dogfood
2. v3.5 = v3.5-alpha + §A arbitrations + §B closures + selected §C work

---

## §E — v3.5 ship-gate criteria proposal

### §E.1 — Audit §12 × HSO Q-V35-7 matrix

[KNOWN per audit §12 + `CONDUCTOR_V3.5_BUILD.md §7 Q-V35-7`]

| Combined gate | Audit §12 row | HSO Q-V35-7 row | Concrete checklist |
|---|---|---|---|
| **v3.5-alpha (HSO infrastructure)** | — | (a) 60-min continuous | ☐ MB-T41 authored + ratified<br>☐ MB-T35-revised merged (action-variant emission)<br>☐ MB-T36 already closed ✓<br>☐ MB-T37 merged (pool manager)<br>☐ MB-T38 merged (swarm-state.md writer with D9 handoff doc scope)<br>☐ MB-T39 merged (peer summary harvester)<br>☐ MB-T40 merged (chat-panel PTY refactor — already shipped ✓ per HEAD)<br>☐ HSO active runs 60-min orchestration without crash<br>☐ ≥2 successful handoffs during run<br>☐ Action variants fire correctly ≥80% per Q-V35-7 (a) |
| **v3.5 minimal (Option A + alpha)** | Option A — ship as-is | (a) 60-min | v3.5-alpha checklist<br>☐ §B.3 audit findings filed |
| **v3.5 cosmetic (Option B + alpha)** | Option B — cheap cosmetic | (a) 60-min | v3.5 minimal<br>☐ §B.1 tile visual separation merged + smoke-verified<br>☐ §B.2 window title suffix merged + smoke-verified<br>☐ §A.2 token source decided + `ctx N%` text wired on one surface (if §A.2 = (a) or (c), the cheap source) |
| **v3.5.1 confidence (Option C + 120-min)** | Option C — cheap + one structural | (b) 120-min | v3.5 cosmetic<br>☐ HSO active runs 120-min orchestration without crash<br>☐ One of: §A.1 = (2) Frame-C-primary shipped (recommended structural) OR §C.6 BUILD.md tab shipped (predicated on HSO Wave 1) |

### §E.2 — Operator decisions to finalize criteria

| Decision | Question | Recommended | Locks |
|---|---|---|---|
| **D1** | Audit §12 selection | Option B (cosmetic) for v3.5 ship, defer Option C structural to v3.5.1 | §A.4 question A |
| **D2** | HSO Q-V35-7 selection | (a) 60-min for v3.5-alpha; (b) 120-min for v3.5.1 ship-confidence | §A.4 question B |
| **D3** | Coupling | Two-gate split: alpha = HSO; ship = HSO + audit | §A.4 question C |
| **D4** | If Option C, structural pick | §A.1 = (2) Frame-C-primary (wireframe-author rec); OR §C.6 BUILD.md tab if HSO Wave 1 ratifies fast | §A.4 conditional |
| **D5** | §A.1 frame target | Option (2) Frame-C-primary + A toggle per §1.1 wireframe-author rec | §C branches |
| **D6** | §A.2 token source | (a) cost_info ratio if Anthropic SDK release cadence stable; (c) PTY scrape if HSO Wave 1 already broadcasts tokens | §C.3/C.4/C.5 + ctx N% wiring |
| **D7** | §A.3 PlanRing/MixIndicator | (2) Add second instance to header-bar | independent |

---

## §F — Followup pass-throughs + cross-doc Q-disposition

### §F.1 — Existing FOLLOWUPS intersecting this plan (read-only inventory)

[KNOWN per audit §11 + repo grep at audit time — verify current state before action]

| Followup ID | Tier | Plan intersection | Closure path |
|---|---|---|---|
| `MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER` | 2 | §C.1 #1 if §A.1 = (1); model chip palette in any §A.1 outcome | §C.1 / §C.1′ ticket includes hex-color closure |
| `MB-F-T19-MUTATION-UI` | 2 | Hero+squad activation UI; relevant in §A.1 = (1) (alone) or (3) (Frame B) | §C.1 / §C.2 |
| `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN` | 2 | MixIndicator data path; relevant in any §A.1 outcome since both shell-toolbar (§A.3 = 2) and Conductor chead instances depend on it | Bundle with §A.3 or §C.1 ticket |
| `MB-F-T27-KILL-EVENT-PROPAGATION` | 2 | Same as above | Same bundle |
| `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` | 2 | §B.3 — file row; closure is v3.6 territory (touches daemon SSE design) | File now, defer closure |
| `MB-F-AUDIT-IPC-SCHEMA-VALIDATION-UNIFORMITY` | 3 | §B.3 — file row; closure is per-ticket-additive, not standalone | File now, defer closure |
| `MB-F-HSO-02-FULL-SCOPE-DOGFOOD` | 1 | HSO ship-gate cross-ref; H4+H5 handoff measurements during dogfood | Per `CONDUCTOR_V3.5_BUILD.md §4.3` — dogfood window |
| `MB-F-HSO-01-WEEKLY-RATE-LIMIT-DOGFOOD` | per ledger | HSO ship-gate cross-ref; 30-min × 3+ peer Q-V35-7 (a) sustained measurement | Per `CONDUCTOR_V3.5_BUILD.md §4.3` — dogfood window |
| `MB-F-T11B-PREDICT-COMMIT-CREATING-IMPL` | per ledger | AnthropicChatClient disposition per `CONDUCTOR_V3.5_BUILD.md MB-T40` — already shipped | Cross-reference, no new ticket |
| `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` | filed | CLAUDE.md §3.4 — relevant for any §C ticket touching dispatch-core schema | Operational hygiene, not a ship-gate item |
| `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` | filed | CLAUDE.md §4.6 — relevant for §B + any §C work touching `src/main/*.ts` | Operational hygiene |
| `MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX` | filed | §C.1′ ticket #3 detail-pane merge action may interact | Cross-reference at ticket-authoring |

### §F.2 — Wireframe inventory Q1-Q7 disposition

[KNOWN per `~/Downloads/wireframe-tickets-inventory.md:498-514`]

| # | Inventory question | Disposition | Plan section |
|---|---|---|---|
| **Q1** | LLM-backed conductor vs deterministic state machine? | **HSO ratifies LLM-backed.** SPIKE-HSO-01 ratified Sonnet 4.6 CC CLI substrate per `CONDUCTOR_V3.5_BUILD.md §4.1` 2026-05-08. | Resolved — no plan action |
| **Q2** | BUILD.md in v3.0 ship-gate? | **Now BUILD.md tab in v3.5 ship-gate.** Deferred to v3.5.1 per §E.1 Option C OR §C.6 if structural pick is BUILD.md tab. | §C.6 + §E.1 |
| **Q3** | MB-T19 (hero+squad) in v3.0? | **Deferred to §A.1.** If §A.1 = (3), shipped via §C.2 ticket #5. If §A.1 = (1) or (2), `MB-F-T19-MUTATION-UI` closes via §C.1 ticket but full Frame B is v3.6+. | §A.1 + §C.1/§C.2 |
| **Q4** | Max-plan auth vs API key? | **HSO ratifies Max-plan.** CC CLI substrate inherits keychain reuse per SPIKE-HSO-01 commit `c1b78c4`. | Resolved — no plan action |
| **Q5** | Commits via daemon endpoint vs `child_process`? | **Shipped via `child_process`** per `commits-ipc.ts` (audit §8.F). | Resolved — close as shipped |
| **Q6** | UI-first vs intelligence-first sequencing? | **HSO answers intelligence-first** (HSO Wave 1 lands MB-T35-revised, MB-T38 before §C.6 BUILD.md tab). Audit-track UI work (§B, §C.1/§C.1′) can ship in parallel with HSO since they touch different files. | §D.3 dependency graph |
| **Q7** | Profile location (`.foxworks/` per-user vs per-repo `.conductor.yaml`)? | **Still open. Deferred to v3.6.** No HSO ticket implements profiles. Per inventory §6 deferral list. | Future arbitration |

### §F.3 — Recommended ticket-authoring order (post-§A arbitration)

[MODELED] Assuming recommended §A outcomes (D1=Option B, D2=60-min for alpha then 120 for v3.5.1, D3=two-gate, D5=Frame-C-primary, D6=cost_info ratio or PTY scrape, D7=add-second-instance):

1. **Immediately (no §A dependency):**
   - §B.3 file 2 findings (verify not already filed)
   - §B.1 tile visual separation ticket
   - §B.2 window title suffix ticket
   - HSO MB-T41 operator-only authoring (parallel to operator)

2. **After §A.1 + §A.2 + §A.3 arbitration:**
   - §C.1′ ticket #1 (Frame router) — load-bearing for tickets #2-4
   - §A.3 (2) → header-bar PlanRing+MixIndicator ticket (can parallel ticket #1)
   - §C.3 or §C.5 spike (token source)

3. **After §C.1′ ticket #1 + spike:**
   - §C.1′ tickets #2 + #4 (Frame C surface + compact mode) in parallel
   - §C.3 or §C.5 token-wiring ticket (with ctx N% text on Pane + Hero surfaces)
   - HSO Wave 1 (MB-T35-revised + MB-T38) per `CONDUCTOR_V3.5_BUILD.md §8` Pattern α — parallel to Frame C work

4. **After §C.1′ ticket #2:**
   - §C.1′ ticket #3 (detail-pane footer actions)
   - HSO Wave 2 (MB-T37 + MB-T39)

5. **After HSO Wave 1+2:**
   - §C.6 BUILD.md tab (depends on swarm-state.md from MB-T38)
   - HSO dogfood validation (Q-V35-7 60-min for alpha, 120-min for v3.5.1)

6. **v3.5-alpha ship-gate:** HSO infrastructure complete + dogfood passed
7. **v3.5 ship-gate:** v3.5-alpha + §B closures + §C.1′ + §A.3 (2) shipped
8. **v3.5.1 ship-confidence:** v3.5 + §C.6 BUILD.md tab + 120-min HSO dogfood

---

## §G — Risks + open questions

[MODELED]

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| §A.1 = (2) Frame-C-primary requires deeper tile-grid-state.json schema changes than budgeted; existing layout persistence breaks | Medium | High — would extend §C.1′ ticket #1 from 3-4 WBs to 6-8 | Pre-ticket spike to verify shell-mode field is additive vs requiring migration |
| §A.2 = (c) PTY scrape relies on HSO infrastructure that may shift during HSO Wave 1 | Low | Medium — would require ticket rework | Defer §A.2 = (c) ticket until HSO Wave 1 stabilizes; meanwhile §A.2 = (a) is independent |
| Wireframe-inventory Q-V35-* unresolved questions overlap audit §10 in ways this plan didn't catch | Low | Low | Audit + inventory cross-read complete in this session; new conflicts surface at ticket-authoring time as followups |
| HSO dogfood (Q-V35-7) reveals action-variant emission fails >20% in real swarm conditions despite SPIKE-HSO-01 ratification | Low per spike evidence | High — would block v3.5-alpha | Per `MB-F-HSO-01-WEEKLY-RATE-LIMIT-DOGFOOD` Tier 1 already filed; mitigation is per BUILD doc §4.3 dogfood window |
| Frame C "diff / merge / focus" actions in detail-pane footer overlap with kanban-side commit surfaces in ways that surface late | Low | Medium | Surface during §C.1′ ticket #3 authoring; defer to followup if integration is not load-bearing |

[SPECULATIVE] **One observation about the audit's framing:** the audit is honest about "stub data behind correct shape" (audit §1.A). The wireframe-author's design intent was a system where stub data is replaced by real data flow before ship. v3.5 has two paths to that real data flow: (1) HSO ships the orchestrator-driven session list (closes model-mix data plumb), (2) §A.2 token source ships real ratios. Without both, v3.5 ships with chrome that looks correct but reads zeros — the "operator demos could be misleading" risk in audit §12 Option A. This makes §A.2 a higher-priority arbitration than its standalone scope suggests.

---

## §H — Out-of-scope (explicit fences per CLAUDE.md §9)

This plan does NOT cover:

- **HSO §5 ticket bodies** — pre-ratified per `CONDUCTOR_V3.5_BUILD.md §5`; this plan references them but does not modify
- **MB-T41 system prompt authoring** — operator-only territory per `CONDUCTOR_V3.5_BUILD.md §3.4`
- **Frozen-contract amendments** — operator-arbitrated per CLAUDE.md §1; §C.4 surfaces the option but does not pre-resolve
- **v3.6 roadmap** — wireframe inventory §6 deferred items remain deferred; no scope absorption
- **Pre-existing test failure re-diagnosis** — per CLAUDE.md §4.5
- **Sherpa / Cortex / Lantern / Group Alpha-Beta-Gamma binaries** — portfolio-plan §5 territory, not v3.5 territory
- **Audit findings filing implementation details** — §B.3 verifies, does not duplicate

---

**End of v3.5 post-audit execution plan.**

Operator action items immediately following this plan:
1. Resolve §A.1 (frame layout target) — three options surfaced; recommended (2) Frame-C-primary per wireframe-author
2. Resolve §A.2 (token source) — three options surfaced; cross-track dependency on HSO if §A.2 = (c)
3. Resolve §A.3 (PlanRing/MixIndicator placement) — recommended (2) add second instance to header-bar
4. Resolve §A.4 (ship-gate criteria) — recommended two-gate split, Option B for v3.5 ship, Option C for v3.5.1 ship-confidence
5. Confirm §B closures can ship in parallel with §A arbitration (recommended yes; they're independent)
6. Confirm §F.2 inventory Q1-Q7 disposition; reopen any that have shifted since 2026-05-08

Once §A items are resolved, §C ticket authoring fires per the §F.3 sequence.

Confidence labels throughout: claims about repo state, audit findings, wireframe content, and HSO BUILD doc are KNOWN per 2026-05-10 session reads. Claims about effort estimates, parallel-CC compression, and cross-track dependencies are MODELED from observed dependency structure. Claims about §E.1 ship-gate option behavior under dogfood are SPECULATIVE pending the dogfood window per `CONDUCTOR_V3.5_BUILD.md §4.3`.
