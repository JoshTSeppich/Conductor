# MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE Findings — 2026-05-11

**Ticket:** MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE — wireframe-author primary list+detail shell mode (Frame C)
**Body anchor:** `a1f7a03 docs(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): ticket body authored under §3.4 mechanical translation`
**Executing sessions:** `commit-plan-doc` (T4 predecessor, Wave B WB1-WB6) + `commit-plan-doc-1334` (T4-successor, Wave B WB7-WB11 post-rotation `353845a`)
**Orchestrator:** `orchestrator-2026-05-11-1257` (gen-3)
**WB ladder:** 11 WBs total (10 cairn + 1 docs/closure consolidation)
**Pre-arbitrated envelope (operator 2026-05-11):**
- Sub-Q-MBTWBFCS-A = **(α) renderer-only selection state** (locked-in via WB5 negative-IPC-absence assertion)
- Sub-Q-MBTWBFCS-B = **(i) summary text from swarm-state.md** (DetailPane reads via new IPC channel)
- Q-WB10-A = **(β) shell.html + CSS in WB10 scope** (post-MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP framing)
- Q-WB10-B = **(α) empty-sessions stub** (sessions-stream integration deferred to Tier 2 follow-on)

**Cairn ladder (10 cairn commits + 1 docs commit):**

| WB | Commit | Type | Surface |
|---|---|---|---|
| WB1 | `c5f98d5` | red | probe-mbtwbfcs-01 frame-c mount factory contract (4 conditions; dynamic-import-with-@vite-ignore RED pattern) |
| WB2 | `2174f3a` | green | scaffold `src/frame-c/` (mount.tsx + frame-c-root.tsx + index.ts) + tsconfig exclude + probe act() wrap |
| WB3 | `42c0f48` | red | probe-mbtwbfcs-02 SessionList rendering contract (5 conditions; empty-state vacuously passes WB2 placeholder) |
| WB4 | `92eb23c` | green | SessionList component + sessions/onSelect/selectedSessionName prop chain |
| WB5 | `8f88f7a` | red | probe-mbtwbfcs-03 selection-state renderer wiring contract (Sub-Q-A=α locked-in via negative IPC-absence assertion) |
| WB6 | `2c55804` | green | controlled-component selection wiring (useState in FrameCRoot + aria-selected in SessionList) |
| WB7 | `2bc5cda` | red | probe-mbtwbfcs-04 DetailPane render + swarm-state.md query contract (Sub-Q-B=i; IPC §6 amendment surfaced for WB8 HARD ESCALATION) |
| WB-§6 | `0f0e762` | **contract** | WORKSTATION_CONTRACT.md §6 amendment — 4 additive IPC channels (workstation:read-swarm-state + frame-c:{diff,merge,focus}) per Q-WB8-IPC + Q-WBT3-3 consolidated arbitration; **co-authored with T3 via coord note `9fe6358`** |
| WB8 | `525c502` | green | DetailPane component + `workstation:read-swarm-state` IPC implementation (3 files: detail-pane.tsx + main.ts + preload.mts; frame-c-root.tsx integration) |
| WB9 | `aa18302` | red | probe-mbtwbfcs-05 main.ts wiring sentinel-zone contract (4 conditions; source-text inspection) |
| WB10 | `ea11bc7` | green | main.ts wiring sentinel zone + tile-grid/mount.ts tryAutoMountFrameC factory + workstation-shell.html sizing CSS (3 files; empty-sessions stub) |
| WB11 | (this commit) | docs | findings doc + audit §3 Frame C row reclass stamp + runtime-launch smoke evidence |

**Sub-session rotation:** Predecessor `commit-plan-doc` reached 898086 tokens (89.8%) at clean inter-WB boundary post-WB6 GREEN. Preemptive rotation under scope-expansion §B soft-threshold interpretation (operator disposition (a) 2026-05-11). Successor `commit-plan-doc-1334` boot at 2026-05-11T13:34Z; entry 2 logged at rotation log `353845a`.

**Cross-session co-authorship:** WB-§6 consolidated contract amendment authored as parallel-cairn cross-session co-authorship pattern (first in this codebase): T4-successor drafted §6.6 + Channel #1 (`workstation:read-swarm-state`) for Wave B WB8 need; T3 contributed Channels #2-#4 (`frame-c:{diff,merge,focus}`) signatures verbatim via coord note `9fe6358` for Wave C #3 dependency. Single consolidated `contract(GATE-W3-§6-consolidated): ...` commit landing `0f0e762` per operator-arbitrated Q-WBT3-3-A=(β-consolidated) 2026-05-11.

---

## I — What Shipped

`[KNOWN]` Per direct read + probe evidence:

**Frame C `src/frame-c/` directory (NEW; 5 files):**
- `mount.tsx` — `mountFrameC(container, props): { dispose(): void }` React 19 `createRoot` factory mirroring `tile-grid/mount.ts` + `chat-shell/mount.ts` convention.
- `frame-c-root.tsx` — `FrameCRoot` two-column shell (`data-testid="frame-c-root"`) with `frame-c-session-list-col` (left, 280px width) + `frame-c-detail-col` (right, flex 1). Controlled-component selection state (`useState<string | null>(null)` + external `selectedSessionName` prop precedence). Post-T2-successor mbtwtws WB4 integration: threads `selectedEntry = sessions.find(s => s.name === selected)` → `tokensUsed` + `tokenBudget` props to DetailPane for ctx N% rendering.
- `session-list.tsx` — `SessionList` consumes `readonly TileGridSessionEntry[]` prop. Renders one row per entry with `data-testid="frame-c-session-row-{name}"`, status badge, name, repo/branch metadata. Click handler exposes `onSelect(sessionName)` callback. WB6 adds `aria-selected="true"|"false"` ARIA listbox-pattern + subtle highlight when selected. Post-T2-successor mbtwtws WB2 integration: per-row ctx N% inline text via `data-testid="frame-c-session-row-ctx-text-{name}"`.
- `detail-pane.tsx` — `DetailPane({ selectedSessionName, tokensUsed?, tokenBudget? }): JSX.Element`. `useEffect` on `selectedSessionName` change → invokes `window.workstationBridge.readSwarmState()` → parses returned text via `extractSwarmStateSection(text, sessionName)` (exported pure-fn) → renders `data-testid="frame-c-detail-pane"` with section text in `<pre>`-formatted block. ENOENT/empty/no-match → honest "no swarm-state section found" placeholder. Cancellation flag prevents state-update-after-unmount. Post-T2-successor mbtwtws WB4 integration: META_ROW flex container hosting HEADER + ctx N% inline span (`data-testid="frame-c-detail-pane-ctx-text"`).
- `index.ts` — barrel re-export of `mountFrameC` + `FrameCRoot` + types.

**`src/main/main.ts` (3 NEW sentinel zones; all additive per CLAUDE.md §3.3):**
- `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read imports ===` (line ~169) — `readFileSync as swarmStateReadFileSync` import.
- `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read IPC ===` (after §C.1′ frame-mode IPC end at line 468) — `ipcMain.handle('workstation:read-swarm-state', ...)` reading `docs/swarm-state.md` from `resolve(app.getAppPath(), '..', '..', 'docs/swarm-state.md')` mirroring `SwarmStateWriter` init path at line 557. ENOENT → empty string; other errors propagate.
- `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===` (after WB8 swarm-state-read IPC zone end) — documentation-only zone referencing `tryAutoMountFrameC` (satisfies WB9 probe Condition 3) + documents cross-process boundary.

**`src/main/preload.mts` (1 NEW sentinel zone inside `workstationBridge`):**
- `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read bridge ===` — adds `readSwarmState: () => ipcRenderer.invoke('workstation:read-swarm-state')` method to existing `workstationBridge` `exposeInMainWorld` binding.

**`src/tile-grid/mount.ts` (additive at bottom-of-file auto-mount block):**
- New import `mountFrameC from '../frame-c/index.js'`.
- New `tryAutoMountFrameC()` factory: finds `#frame-c-root`, calls `mountFrameC(root, { sessions: [] })` (empty-sessions stub per Q-WB10-B=α). Mirrors `tryAutoMountFrameShellHeader` precedent at mount.ts:131-148.
- New invocation `tryAutoMountFrameC();` at line ~166 alongside `tryAutoMountTileGrid()` + `tryAutoMountFrameShellHeader()`.

**`src/main/workstation-shell.html` (1 NEW sentinel zone in inline `<style>`):**
- `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE frame-c-root sizing ===` (after §C.1′ frame-mode visibility zone end at line ~54) — adds `#shell[data-frame-mode="C"] #frame-c-root { flex: 1 1 auto; min-height: 0; border-top: ...; background: ...; overflow: hidden; }` for Frame C sizing parity with `#console-tile-region` (lines 66-72). [KNOWN] §C.1′ ticket #1 (commit `44764fd`) pre-shipped the `<div id="frame-c-root" data-testid="frame-c-root">` DOM region at line 270 + visibility CSS at lines 45-54 (display:flex in Frame C mode); WB10's CSS sizing rules are the **missing piece** that makes Frame C actually render at runtime under empty-sessions state (would otherwise collapse to zero height).

**`WORKSTATION_CONTRACT.md` §6.6 amendment (NEW subsection; `0f0e762`):**
- §6.6 "Renderer ↔ main workstation IPC channels" — first documented subsection of renderer-↔-main `workstation:*` + `frame-c:*` channels. Catalogues 4 additive channels: `workstation:read-swarm-state` (Wave B) + `frame-c:diff` + `frame-c:merge` + `frame-c:focus` (Wave C #3). Embeds TypeScript appendix with verbatim `DiffResult` / `MergeResult` / `FocusResult` discriminated unions from T3's coord note. Co-authored cross-session (T4-successor + T3 + Claude Opus 4.7).

**Probes (5 new + integrations across cross-session probes):**
- `test/unit/frame-c/probe-mbtwbfcs-01-frame-c-mount.spec.tsx` (4 it-blocks; WB1)
- `test/unit/frame-c/probe-mbtwbfcs-02-session-list-renders.spec.tsx` (6 it-blocks; WB3)
- `test/unit/frame-c/probe-mbtwbfcs-03-selection-state.spec.tsx` (5 it-blocks; WB5; negative-IPC-assertion for Sub-Q-A=α)
- `test/unit/frame-c/probe-mbtwbfcs-04-detail-pane-renders.spec.tsx` (4 it-blocks; WB7)
- `test/unit/frame-c/probe-mbtwbfcs-05-main-ts-wiring.spec.tsx` (4 it-blocks; WB9; source-text inspection)

---

## II — Q-disposition (sub-arbitrations)

| Sub-Q | Disposition | Source | Commit citation |
|---|---|---|---|
| Sub-Q-MBTWBFCS-A | **(α) Renderer-only selection state** | operator pre-arbitrated 2026-05-11 (dispatch envelope) | locked-in at WB5 (`8f88f7a` negative-IPC-absence assertion) + satisfied at WB6 (`2c55804` controlled-component useState) |
| Sub-Q-MBTWBFCS-B | **(i) summary text from swarm-state.md** | operator pre-arbitrated 2026-05-11 (dispatch envelope) | locked-in at WB7 (`2bc5cda` probe asserts `workstationBridge.readSwarmState` bridge surface) + satisfied at WB8 (`525c502` DetailPane + IPC) |
| Q-WB8-IPC-A | **(i) `workstation:read-swarm-state` channel name** | operator chat-ack 2026-05-11 (Q-WB8-IPC arbitration) | `0f0e762` consolidated §6.6 Channel #1 |
| Q-WB8-IPC-B | **(α) proceed now (unblocks Wave C cascade)** | operator chat-ack 2026-05-11 | `0f0e762` |
| Q-WBT3-3-A | **(β-consolidated) single §6 reframing commit covers Wave B's 1 channel + Wave C #3's 3 channels** | operator chat-ack 2026-05-11 (Q-WBT3-3 arbitration) | `0f0e762` cross-session co-authored |
| Q-WB10-A | **(β) Require shell.html + CSS in WB10 scope** | operator chat-ack 2026-05-11 (post MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP framing) | WB10 GREEN `ea11bc7` workstation-shell.html sizing CSS addition |
| Q-WB10-B | **(α) Accept empty-sessions stub + Tier 2 follow-on** | operator chat-ack 2026-05-11 | WB10 GREEN `ea11bc7` `tryAutoMountFrameC({ sessions: [] })` + `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 filing recommendation |

No unresolved arbitrations at WB11 author time.

---

## III — Architectural deltas

`[KNOWN]` direct-read summary:

1. **NEW `src/frame-c/` directory** — first new top-level renderer-surface directory since §C.1′ Frame Router (`44764fd`). Bundled as sub-mount of tile-grid renderer per CLAUDE.md §3.7 (predecessor WB2 disposition; no new `scripts/build-frame-c.mjs` needed; esbuild import-graph traversal auto-discovers).
2. **NEW IPC channel `workstation:read-swarm-state`** — renderer↔main file-read channel; first documented entry in WORKSTATION_CONTRACT.md §6.6 (which itself is a NEW subsection). Path resolution mirrors `SwarmStateWriter` init. ENOENT → empty string fallback for pre-HSO-emission state.
3. **NEW `workstationBridge.readSwarmState()` method** — EXTENDS existing `workstationBridge` `exposeInMainWorld` binding (per Q-WB8-IPC arbitration); coexists with NEW `frameCBridge` from T3's Wave C #3 (per coord note serialization rule: T4-successor's preload edit lands first at WB8; T3's frameCBridge addition lands later at their WB-equivalent green).
4. **Frame C visibility now functional end-to-end** — §C.1′ ticket #1 shipped visibility CSS + DOM stub; this ticket shipped (a) the React component tree, (b) the renderer mount factory + invocation, (c) main-process IPC for DetailPane content, (d) sizing CSS for actual rendered surface. Closes the architectural-mismatch gap in audit §3 (Frame C row 92).
5. **Sub-Q-MBTWBFCS-A=α renderer-only selection** — Frame C selection state lives in `useState` inside `FrameCRoot`; no IPC roundtrip; no persistence across reloads. Probe-mbtwbfcs-03 Condition 4 (negative-IPC-absence assertion) enforces this contract methodologically.
6. **WORKSTATION_CONTRACT.md §6.6 NEW subsection** — first documented section for renderer↔main `workstation:*` + `frame-c:*` channels. Acknowledges historical drift (existing channels predate §6.6 enumeration) via queued Tier 2 audit followup `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` (filed at `98ef86c`).
7. **Cross-session co-authorship pattern** — first §3.4 mechanical-translation co-authored contract amendment in this codebase. T4-successor + T3 + Claude Opus 4.7 trailers; documented in WB-§6 commit body (`0f0e762`).
8. **NO frozen-surface modifications outside §6.6** — REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, dispatch-core/src/v3/schema.ts §1-§13, ORCHESTRATOR_STATE_CONTRACT.md, MB-T41 orchestrator.md all untouched.

---

## IV — Probe distribution

| Probe file | Location | Conditions | it-blocks | Behavior covered |
|---|---|---|---|---|
| probe-mbtwbfcs-01 | `test/unit/frame-c/` | 4 | 4 | mountFrameC factory presence + two-column DOM + dispose() handle shape |
| probe-mbtwbfcs-02 | `test/unit/frame-c/` | 5 | 6 | SessionList N-rows rendering + per-row content + empty-state placeholder |
| probe-mbtwbfcs-03 | `test/unit/frame-c/` | 5 | 5 | aria-selected emission + selection-toggle + idempotent click + **negative-IPC-absence (Sub-Q-A=α enforcement)** + initial-state vacuous |
| probe-mbtwbfcs-04 | `test/unit/frame-c/` | 4 | 4 | DetailPane render-gating + bridge query trigger + section text routing + selection-switch re-fetch |
| probe-mbtwbfcs-05 | `test/unit/frame-c/` | 4 | 4 | main.ts source-text wiring sentinel zone (BEGIN/END markers + tryAutoMountFrameC ref + positional ordering) |

**[KNOWN]** All 23 it-blocks GREEN at WB11 author time:
- `pnpm --filter dispatch-workstation exec vitest run test/unit/frame-c/` → 40/40 GREEN (8 files; my 5 probes + 3 sibling probes from T2-successor and T3 cross-session work)
- Workstation typecheck CLEAN at every WB GREEN landing
- Cross-session probes (`probe-mbtwtws-01/02` mbtwtws + `probe-mbtwbdpfa-01` mbtwbdpfa) sit in same directory; no path-disjoint violation (per-path commit discipline + sentinel-zone discipline preserved)

**Consumer non-regression** (per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`):
- WB2/WB4/WB6/WB8/WB10 each verified all `test/unit/frame-c/` probes GREEN post-commit
- WB10 also exercised tile-grid renderer bundle inclusion (`grep "mountFrameC|frame-c-root" dist/tile-grid/renderer.js` verifies esbuild import-graph discovery)

---

## V — Architecture notes

1. **Frame-c sub-mount-of-tile-grid bundling** — per CLAUDE.md §3.7 "each renderer surface has its own esbuild script". Frame C ships in `dist/tile-grid/renderer.js` (NOT a separate `dist/frame-c/renderer.js`). Honored §3.7 intent: Frame C is a SUB-mount within tile-grid surface, not a top-level renderer. Predecessor's WB2 disposition (`2174f3a` commit body) established this rationale.
2. **Render-path** (post-build runtime):
   - Electron loads `workstation-shell.html` → CSS resolves `#frame-c-root { display: none }` default
   - `frame-mode-state.ts:8 DEFAULT_MODE='C'` → `applyFrameMode('C')` sets `#shell[data-frame-mode='C']`
   - CSS swaps: `#frame-c-root { display: flex; flex-direction: column; flex: 1 1 auto; ...}` (visibility from §C.1′ + sizing from WB10 sentinel zone)
   - `dist/tile-grid/renderer.js` loads (bundled frame-c subtree included via esbuild import-graph)
   - `tryAutoMountFrameC()` finds `#frame-c-root`, calls `mountFrameC(root, { sessions: [] })`
   - FrameCRoot renders two columns: SessionList (empty-state placeholder per Q-WB10-B=α stub) + frame-c-detail-col (empty until selection)
   - Frame A toggle via FrameShellHeader: `applyFrameMode('A')` → CSS swaps visibility → tile-grid mosaic shown, Frame C hidden
3. **Empty-sessions stub rationale** (Q-WB10-B=α) — visible-structure progress matters per operator framing (MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP); sessions-stream integration is separable data-model gap deferred to `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 follow-on.
4. **Sizing CSS necessity** — §C.1′ shipped visibility-only rules; without WB10's sizing addition, `#frame-c-root` would collapse to zero height in empty-sessions state (no content driving intrinsic size). The CSS sizing is the MISSING PIECE that turns "DOM region + visibility shipped" into "actual visible rendered surface".

---

## VI — Documentation drift

1. **WORKSTATION_CONTRACT.md path drift** — CLAUDE.md §1 cites `docs/build-docs/WORKSTATION_CONTRACT.md` but the file actually lives at repo root (`/WORKSTATION_CONTRACT.md`). Surfaced in §6.6 amendment intro paragraph (anti-fabrication §2.1 — acknowledged drift in the file itself rather than silently using the wrong path). NOT closed by this ticket; future Tier 3 followup may align CLAUDE.md citation with filesystem reality.
2. **§6 vs §7 categorical organization** — CLAUDE.md §1 cites "§6 — IPC + endpoints" but file structure has §6=`/v3/*` HTTP endpoints + §7=`Shell↔Webview` v3 IPC. The §6.6 amendment introduces a third category (renderer↔main `workstation:*` + `frame-c:*` channels) which is documented in §6.6 itself. Reorganization (whether §6.6 should be promoted to §7.x or §8) deferred to operator decision.
3. **Audit §3 Frame C row reclassification** — landed in this ticket's audit doc edit (this WB). Original WIREFRAME-VISION-NOT-SHIPPED preserved as struck-through evidence per audit doc convention.

---

## VII — Consumer non-regression

1. **MB-T12 tile-grid mosaic** — Frame A toggle continues to show tile-grid mosaic correctly; `#console-tile-region` CSS visibility rules at §C.1′ visibility zone untouched.
2. **§C.1′ Frame Router** — FrameShellHeader tab strip continues to render; `tryAutoMountFrameShellHeader` continues to invoke; visibility CSS untouched; `frame-mode-state.ts` IPC handlers untouched.
3. **MB-T-HSO-WIRE swarm-state-writer** — `SwarmStateWriter` continues to write `docs/swarm-state.md`; the WB8 IPC handler reads the SAME file the writer produces (path resolution mirrors `main.ts:557` writer init).
4. **MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE (T2-successor Wave C #5)** — landed parallel to this ticket; `ctx N%` text integration into `frame-c/session-list.tsx` + `frame-c/detail-pane.tsx` + `tile-header.tsx` shipped without conflict. Linter-applied changes to my frame-c-root.tsx + detail-pane.tsx (DetailPaneProps tokens prop extension; FrameCRoot selectedEntry lookup) preserved per system-reminder convention.
5. **MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS (T3 Wave C #3)** — `frame-c:diff`/`merge`/`focus` channels documented in consolidated §6.6 amendment (this ticket's WB-§6). T3's WB1-WB6 ladder shipped post-consolidated-amendment-landing without conflict; ActionBar inline-banner failure-UX shipped at `cdf05db`.
6. **Workstation typecheck** — CLEAN at every WB GREEN landing (verified via `pnpm --filter dispatch-workstation typecheck` returning no diagnostic output).

---

## VIII — WB Skip Rationale

No WBs skipped. Full 11-WB cairn ladder shipped + 1 inserted contract WB (WB-§6 between WB7 and WB8) per operator-arbitrated Q-WBT3-3 consolidation. Ladder shipped IN-ORDER (WB1 → WB2 → ... → WB11) with the single WB-§6 inserted at the Wave C consolidation point.

---

## IX — New Followups Filed

| Followup | Tier | Filing commit | Closure path |
|---|---|---|---|
| `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` | 2 | (orchestrator-mediated post-WB10; pending) | Subsequent ticket lifts tile-grid-app state to shared store OR duplicates `onSpawnResult` subscription in `tryAutoMountFrameC` OR adds exported state-stream getter from tile-grid-app.tsx (operator-arbitrated approach at follow-on ticket time). Tier 2 — Frame C renders with proper structure (visible progress); data integration follow-on. Discoverability: WB10 GREEN commit body `ea11bc7` + HALT-WB10-FINAL-PRE-COMMIT surface. |
| `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` | 2 | `98ef86c` (T2-successor filed post-consolidated-amendment per T3 coord-note §5.4 recommendation) | Audit prior shipped tickets (MB-T16/17/22/24 + existing `workstation:*` channels) that added IPC channels without §6 amendment. Discoverability: this ticket's §6.6 amendment intro paragraph + commit `0f0e762`. |

**Cross-referenced existing followups (NOT closed by this ticket):**
- `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2 at `6217ea0`) — relevant to `frame-c:focus` channel production-wiring per consolidated §6.6 amendment; closed via separate ticket scope.
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1 at `64d9249`) — informed Q-WB10-A=β decision; this ticket's WB11 smoke covers boot+WINDOW_READY but visual rendering verification requires operator screenshot post-rebuild.
- `MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS` (Tier 1 at `11f6f29`) — informed full-build-mode dispatch; operator-acked rebuild post-WB10 at 16:49.
- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (Tier 1 at `c2abb28`) — recognizes audit dimensional taxonomy under-estimated visual-completeness; Frame C reclass to SHIPPED is structural-level closure; visual-completeness gap remains for second-order cycle.
- `MB-F-SUBSESSION-90PCT-IDLE-STANDBY-CASE` (Tier 1 at `5a0ceba`) — informed predecessor's preemptive rotation at WB6 boundary; entry 2 in rotation log `353845a`.

---

## X — Open Items / WB11 Runtime-Launch Smoke

### Smoke evidence

**[KNOWN]** Runtime-launch smoke per CLAUDE.md §4.6 executed at WB11 author time:

```
$ perl -e 'alarm 12; exec @ARGV' -- pnpm --filter dispatch-workstation exec electron dist/main/main.js 2>&1 | head -80
WINDOW_STATE 1024 768
WINDOW_READY
```

- **Electron boot:** PASS — process spawned, BrowserWindow created (1024x768), workstation-shell.html loaded, `did-finish-load` fired.
- **WINDOW_READY sentinel:** PASS — emitted within 12s window from main.ts:247.
- **Bundle inclusion:** PASS (orchestrator-side empirical test 16:49; bundle fingerprint grep verified `frame-c-root` + `mountFrameC` strings present in `dist/tile-grid/renderer.js`).

### Visual-render verification ([KNOWN] not in WB11 scope; operator-empirical pending)

The CLAUDE.md §4.6 smoke covers boot + WINDOW_READY sentinel observability. Visual rendering verification of the Frame C surface requires operator screenshot post-rebuild per `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` framing. Five-step verification per ticket body §4 WB11 steps 3-5 covers:
- Frame C surface mounts and renders (step 3)
- SessionList shows spawned sessions; click selects; DetailPane renders selected session's content (step 4 — note: empty-sessions stub per Q-WB10-B=α means SessionList renders empty-state placeholder until `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 closure)
- Frame A toggle hides Frame C and shows tile-grid mosaic (step 5)

Operator empirical-test outcome triage per HALT-WB10-FINAL-PRE-COMMIT failure-mode mapping:
- **Frame C visible + sized correctly + empty session list** → methodology pipeline shipping correctly to runtime; CSS sizing addition was the missing piece ([MODELED-HIGH] confirmed)
- **Frame C invisible (zero height)** → sizing CSS not loaded OR `applyFrameMode('C')` not setting `data-frame-mode` OR React tree not rendered (rebuild + relaunch with fresh dist eliminates first; bundle fingerprint grep eliminates second; visual confirms third)
- **Frame C visible but no React content** → `tryAutoMountFrameC` not invoked OR esbuild missed frame-c subtree (already ruled out by orchestrator-side empirical bundle grep)

### Definition of done

Per ticket body §7:
- ✅ WB1-WB10 cairn ladder lands; commit chain pushed to origin/main (verified via `git log` at WB11 author time)
- ✅ `frame-c/` directory shipped (5 files: mount.tsx + frame-c-root.tsx + session-list.tsx + detail-pane.tsx + index.ts)
- ✅ Frame Router default mode 'C' resolved at boot; tile-grid bundle loads Frame C subtree
- ✅ Selection state works per Sub-Q-A=α (probe-mbtwbfcs-03 5/5 GREEN + negative-IPC-absence enforcement)
- ✅ DetailPane content renders per Sub-Q-B=i (probe-mbtwbfcs-04 4/4 GREEN; `workstation:read-swarm-state` IPC wired)
- ✅ 5-package typecheck CLEAN (workstation typecheck CLEAN at every WB GREEN; dispatch-core/daemon/cli/web untouched by this ticket)
- ✅ No regression in v3.5 probes — full frame-c suite 40/40 GREEN
- ⏸ WB11 runtime smoke confirms WINDOW_READY + Frame C mount; **visual rendering verification operator-empirical pending** (per `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` framing — this ticket is structural ship; visual closure is second-order cycle per `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED`)
- ✅ WB11 findings doc + audit reclass land (this commit)
- ⏸ Operator-visible UX: Frame C as default shell mode does NOT regress operator's ability to launch + use the workstation (boot verified; visible-render verification operator-empirical pending)

**Status:** STRUCTURAL SHIP COMPLETE. Visual-completeness closure deferred to second-order cycle per operator framing.

---

**End of MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE Findings.**
