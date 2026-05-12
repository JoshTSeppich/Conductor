# MB-T-WIREFRAME-T3-ACTION-BAR-WIRING — Findings (2026-05-12)

**Ticket body:** `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T3-ACTION-BAR-WIRING_BUILD.md` (committed in contaminated co-commit `0d71590` per option-(A) operator disposition).
**Authoring delegate:** T3 sub-session (Opus 4.7) spawned by orchestrator-2026-05-11-1257 (gen-3 PRIMARY) for Phase 1 ticket-body authoring + WB ladder execution.
**Anchor commits:** ticket body `0d71590` (co-commit); WB1-WB8 ladder `5565a60` → `e713cbd`.
**Round:** 9 of cairn-under-stress.
**Status:** 8 of 9 WBs landed + pushed; WB9 docs (this file) is the final WB.

---

## §I — Sub-Q resolutions (operator-arbitrated 2026-05-12 paste-buffer dispatch)

All 6 Sub-Qs resolved at recommended defaults:

| Sub-Q | Topic | Resolution | Material consequence |
|---|---|---|---|
| **A** (LOAD-BEARING) | Kill action IPC channel choice | **(α) Reuse `workstation:session-kill`** (MB-T11 WB3) | NO new IPC channel; NO §6 amendment; DetailPane host adapts `SessionKillReply` nested-error shape → `ActionBarFailureState` flat shape via WB6 `adaptSessionKillFailure` |
| **B** | ActionBar placement | **(i) inside DetailPane bottom-right** | DETAIL_PANE_STYLE refactor to flex-column; ActionBar mounted inside DetailPane's footer div |
| **C** | Diff result rendering | **(i) inline-expansion below ActionBar** | `[data-testid="frame-c-diff-output"] <pre>` rendered when `diffOutput` state non-null; cleared on any subsequent action click |
| **D** | `frame-c:scroll-to-session` consumer | **(ii) defer to T1 sibling** | T3 plumbed bridge call only; tile-grid renderer-side `ipcRenderer.on('frame-c:scroll-to-session', ...)` is T1 territory. Filed `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` Tier 3 (this WB9 docs commit) |
| **E** | bypass-perms indicator data source | **(ii) spawn-mode-per-session** | ActionBar accepts `spawnMode?: 'auto' \| 'ask'`; DetailPaneProps threaded through; FrameCRoot passes undefined ship-shy (fallback (b)) because `TileGridSessionEntry.spawnMode` field is absent — filed `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 |
| **F** | lookupSession STUB closure scope | **(ii) defer to separate ticket** | `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 (FOLLOWUPS.md row 329) remains OPEN; click paths surface `SessionNotFound` failure banner under realistic dogfood |

---

## §II — Anti-fabrication finding (resolved at §2.1 of ticket body)

`[KNOWN]` Direct grep at HEAD `8eab991` resolved the dispatch §2 line 95 channel-name miscite:

| Dispatch says | Actual at HEAD |
|---|---|
| "new IPC: `workstation:kill-session` — requires contract amendment" | `workstation:session-kill` (hyphenation order opposite) ALREADY EXISTS — shipped at MB-T11 WB3 (session-kill-ipc.ts:229 + WorkstationSessionKillRequestSchema at dispatch-core/src/v3/schema.ts:1030 + workstationBridge.killSession at preload.mts:137) |

Documented in ticket body §2.1 and §3.1. Sub-Q-A=(α) reuse driven by this finding — zero frozen-surface touch under default envelope.

---

## §III — WB ladder verification summary

| WB | Type | Commit | Probes | Verification |
|---|---|---|---|---|
| WB1 | red | `5565a60` | 5 (4 runtime RED + 1 type-level RED via `@ts-expect-error`) | RED state via DOM-null + TS2578-future-unused |
| WB2 | green | `7009b72` | 5 GREEN flip | onKill prop + button + `'kill'` in `ActionBarFailureState.action` union |
| WB3 | red | `ff09a13` | 5 (all 5 RUNTIME RED — DetailPane doesn't mount ActionBar) | DOM-null waitFor target |
| WB4 | green | `e05add2` | 5 GREEN flip (bridge call-shape: bare-sessionName for frameCBridge, `{sessionName}` for workstationBridge.killSession) | useCallback handlers + ActionBar mount |
| WB5 | red | `5ad6810` | 5 (waitFor-timeout RED — fire-and-forget never resolves failureState) | banner-null waitFor target |
| WB6 | green | `a587336` | 5 GREEN flip | adaptSessionKillFailure + await + setFailureState + onDismissFailure + diffOutput inline render |
| WB7 | red | `e56f63c` | 5 (3 active RED + 2 trivial-baseline GREEN per Wave C #3 WB5 probe-05a pattern) | indicator-null query + TS2578-future-unused |
| WB8 | green | `e713cbd` | 5 GREEN flip | spawnMode prop + indicator + source label + DetailPane thread-through |
| WB9 | docs | (this commit) | N/A — findings + FOLLOWUPS | — |

**Aggregate test coverage** [KNOWN, verified at WB8 GREEN]: 36/36 probes pass across 7 spec files (5 T3 + Wave C #3 WB1 + Wave C #3 WB5 + Wave B WB7). Typecheck CLEAN at every WB.

---

## §IV — Runtime-launch smoke (deferred to operator-mediated post-WB9 docs)

Per CLAUDE.md §4.6 + ticket body §7 Definition of Done point 10, runtime-launch smoke is required before merge. Per dispatch §3.5 visual-comparison gate, the gate uses operator-manual-screenshot fallback until T6 headless screenshot pipeline ships (closure paths α + β landed at HEAD; γ headless still pending).

**Pre-flight requirements** (operator-runnable):
```
pnpm --filter dispatch-core build
pnpm --filter dispatch-workstation build
pnpm --filter dispatch-workstation exec electron dist/main/main.js
```

**Expected behavior at HEAD `e713cbd` + WB9 docs landing:**
1. Workstation launches; `WINDOW_READY` sentinel observed within ~10s.
2. Toggle to Frame C via existing FrameMode='C' control.
3. Select session in left rail (SessionList).
4. DetailPane renders for selected session: meta-row (session name + ctx %) + swarm-state pre + ActionBar at bottom.
5. ActionBar shows: bottom-left = "dispatch-workstation" source label (no indicator if spawnMode absent — ship-shy default per Sub-Q-E=(ii)/(b)); bottom-right = 4 buttons (Diff / Merge / Focus / Kill).
6. Click each button:
   - Diff / Merge / Focus → failure banner with `SessionNotFound` (expected per lookupSession STUB; `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` remains open).
   - Kill → either success (if a tmux session exists for the selected name) OR `TmuxKillError` / `SessionNotFoundError` (NESTED → adapted via adaptSessionKillFailure to banner).
7. Click Dismiss → banner unmounts.

If runtime surface differs from expected, file Tier 1 `MB-F-MBTWFT3-RUNTIME-SURFACE-<DESCRIPTOR>` + HALT per ticket body §4 WB-FINAL.

---

## §V — Followups filed at this WB9 docs commit

(See FOLLOWUPS.md row additions in this commit.)

1. **`MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (Tier 2)** — `TileGridSessionEntry` at HEAD lacks `spawnMode` field; DetailPane passes undefined ship-shy until T1 sibling adds the field + populates from spawn-result.
2. **`MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` (Tier 3)** — `frame-c:scroll-to-session` event emitted by `frame-c:focus` handler (main.ts:577) has no renderer-side subscriber; Sub-Q-D=(ii) deferred to T1.
3. **`MB-F-FRAME-C-DIFF-RENDERING-RATCHET` (Tier 3)** — placeholder for operator-driven escalation from inline-expansion (Sub-Q-C=(i)) to modal/external-difftool if dogfood proves insufficient.

## §V.5 — Supplementary field evidence for `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12`

Two T3-side near-miss detections during ladder execution (both detected pre-commit + remediated per operator's reinforced Q7 protocol):

| Incident | Commit context | Sibling involved | Resolution |
|---|---|---|---|
| #1 (WB1 RED authoring) | Pre-commit `git diff --cached --name-only` showed T1 ticket body file staged alongside my T3 probe | T1 sibling (concurrent ticket-body authoring) | `git restore --staged -- <T1 path>` surgically unstaged; T1 subsequently committed their file in own commit `ec60622` |
| #2 (WB3 RED authoring) | Pre-commit check showed T1 probe `probe-mbtwt1-02-sessions-stream-roundtrip.spec.tsx` staged alongside my T3 probe | T1 sibling (concurrent WB2 RED authoring) | Same remediation; T1 then committed in own commit (sequence captured in `b641eac` per Tier 1 row update) |

Both incidents reinforce closure-path-(β) (mechanical pre-commit hook defense) + closure-path-(δ) (per-session worktree isolation per dispatch §5.1) as load-bearing for parallel-cairn cadence.

---

## §VI — Cross-session coordination notes

| Sibling workstream | Coord seam | Status at T3 WB9 |
|---|---|---|
| **T1** (Session data flow) | Tile-grid renderer-side `frame-c:scroll-to-session` subscription (Sub-Q-D=ii) + `TileGridSessionEntry.spawnMode` field addition (Sub-Q-E=ii) | T1 was authoring ticket body during my WB1; subsequently active. Both followups filed for T1 future closure. |
| **T2** (Terminal stream) | DetailPane DOM slot ordering — T2 owns TerminalStream + header-bar additions; T3 added flex-column layout with ActionBar in footer. T2 must integrate TerminalStream into `DETAIL_PANE_BODY_STYLE` region without colliding with footer | T2 was at HALT-WB3-PRE-COMMIT during my WB4; T2 WB2 GREEN landed (`d627096`). No conflict observed at T3 final WB. |
| **T6** (Methodology infra) | Path-disjoint; build-freshness gate (α) + bundle-inclusion verification (β) shipped. Headless screenshot (γ) deferred. | α + β landed; T3 ladder benefited from auto-rebuild discipline indirectly. |

---

## §VII — Outcome classification per CLAUDE.md §2.11

**Improved (binary flip + behavioral quality)** — T3 ticket scope:
- Kill button + onKill prop + `'kill'` in failureState union: shipped.
- DetailPane mounts ActionBar + 4 bridge useCallbacks: shipped.
- Failure-banner plumb-through for all 4 actions including SessionKillError adapter: shipped.
- Bypass-perms indicator + dispatch-workstation source label: shipped.
- Inline diff-output rendering (Sub-Q-C=i): shipped.

**Capability enabled with known limitations** (T3-scoped sub-classification):
- End-to-end Frame C action bar wiring is structurally complete + tested at probe layer; production behavior depends on:
  - `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 closure (separate ticket) → diff/merge/focus surface `SessionNotFound` until then.
  - `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 closure (T1 territory) → bypass-perms indicator hidden until then.
  - `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` Tier 3 closure (T1 territory) → focus action toggles FrameMode but tile-grid doesn't scroll/highlight until subscription wired.

---

## §VIII — Definition-of-done checklist

Per ticket body §7:

- [x] (1) WB0 contract commit — N/A under Sub-Q-A=(α) default.
- [x] (2) WB1+WB2 kill button shipped; 5 probes flipped.
- [x] (3) WB3+WB4 DetailPane mounts ActionBar + 4 bridge callbacks; 5 probes flipped.
- [x] (4) WB5+WB6 failure-banner UX for all 4 actions including kill adapter; 5 probes flipped.
- [x] (5) WB7+WB8 bypass-perms indicator + source label; 5 probes flipped.
- [x] (6) WB9 docs (this commit).
- [x] (7) Consumer non-regression verified — Wave B WB7 + Wave C #3 WB1/WB5 all GREEN at every WB.
- [x] (8) Workstation typecheck CLEAN at every WB.
- [x] (9) Dispatch-core build fresh — N/A (T3 touched no dispatch-core schemas).
- [ ] (10) Runtime-launch smoke — DEFERRED to operator per dispatch §3.5 visual-comparison gate fallback (operator-manual until T6 headless γ ships).
- [ ] (11) Operator visual verification against wireframe target — DEFERRED to operator-side post-merge.

---

## §IX — Authoring stats

| Stat | Value |
|---|---|
| WB count | 9 (matches ticket body §4 default estimate) |
| Commits | 9 (8 ladder + 1 docs) |
| Files modified | 3 src files (`action-bar.tsx`, `detail-pane.tsx`, this findings doc) + 4 probe specs |
| Total LOC added (probes) | ~928 lines (5 spec files) |
| Total LOC added (src) | ~146 lines net (action-bar.tsx +60L; detail-pane.tsx +86L net after WB6 type/adapter additions + WB4 layout refactor) |
| Methodology incidents observed | 1 contamination (T6 swept T3 ticket body into `0d71590`) + 2 near-misses detected pre-commit (T1 staging at WB1 + WB3) |
| Frozen surface touches | 0 |
| Anti-fabrication catches | 1 (dispatch §2 line 95 channel-name miscite) |

---

**End of MB-T-WIREFRAME-T3-ACTION-BAR-WIRING findings.**
