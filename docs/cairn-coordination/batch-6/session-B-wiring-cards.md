# Batch 6 — Session B — wiring-cards

## §0 Staging verification (cross-session pre-flight)

- [x] Operator confirmed re-scope doc landed in `docs/build-docs/CONDUCTOR_V3_RESCOPE.md`
  - KNOWN: file present at expected path. Operator-listed commit 69ac132 in session-start brief.
- [x] Operator confirmed all 9 dogfood findings filed (#67–#75)
  - KNOWN: `docs/cairn-findings.md` headings `## Finding #67` through `## Finding #75` present at lines 541–709 inclusive. Verified by grep against the file.
- [x] Worktree at `~/Desktop/Automata/foxworks-worktrees/batch-6-session-B` on branch `session-B/wiring-cards`
  - KNOWN: HEAD = `89cfb955724c3ab1bcec502cd0d0da67c5794e7c`; `git rev-parse --abbrev-ref HEAD` = `session-B/wiring-cards`.
- [x] origin/main fetched, branch up-to-date with main
  - KNOWN: ahead/behind = 0/0 against `origin/main`.
  - SPECULATIVE-quirk: `git rev-parse @{upstream}` returns `origin/main` (i.e. local branch `session-B/wiring-cards` has its upstream set to `origin/main`). This is unusual for a worktree-created branch — a default `git push` without args could push to main. Mitigation: every push will be explicit `git push -u origin session-B/wiring-cards` (first push retargets upstream; subsequent pushes use the retargeted upstream). Surfacing for sibling sessions; no operator arbitration requested unless they hit the same.
- [x] Per-path `git add` discipline; `git add -A` never used
  - MODELED at staging time: methodology commitment, not a file artifact. Enforced per commit via pre-stage `git status --short` review and post-commit `git log -1 --stat` confirmation. Round 1 Incident 8 evidence motivates strict adherence.

### Staging-execution deviations noted

1. **Coord file self-created.** Per coordination scaffold §0 item 4, "operator creates the three per-session coord files (templated below) before sessions start, so each session's first commit can append session-start." This file did not exist when Session B started; I created it from the scaffold §3 template as my first commit. Sibling sessions A and C should expect to do the same. Low-severity scaffold-execution gap, no operator arbitration requested.

2. **`workstation-shell.html` path correction.** Coordination scaffold §1 (Session B "Files SHARED with Session C") and the operator session-start brief §2 both reference `packages/dispatch-workstation/src/workstation-shell.html`. Actual location is `packages/dispatch-workstation/src/main/workstation-shell.html` (verified via `find packages/dispatch-workstation -name '*.html'`). Ownership semantics ("disjoint regions" with Session C) carry over unchanged at the corrected path. Session B will edit the actual file at the actual path. Surfacing for sibling-session and operator-relay visibility.

---

## §1 Followups owned (per coordination scaffold §1)

- **MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING** (Tier 1) — webview preload script exposing `window.cardBridge` (emit methods); CJS output per MB-F-ZIPPER-2-ESM-PRELOAD lesson.
- **MB-F-MB-T07-MAIN-IPC-WIRING** (Tier 1) — `registerCardIpcHandlers(...)` call in `main.ts`, sentinel-marked region; covers imports + call per operator patch 2.
- **MB-F-MB-T07-DAEMON-AUDIT-CLIENT** (Tier 1) — `HttpDaemonClient.postAudit(req)` → `POST /v3/orchestrator/audit`; fire-and-forget on failure per WC §6.2.
- **MB-F-MB-T07-CARD-CONTEXT-CACHE** (Tier 1) — `CardContextCache` class implementing `CardContextLookup`, plus singleton export per operator patch 1.
- **MB-F-MB-T07-ORCHESTRATOR-CARD-EMITTER** (Tier 1) — `coarchitect-ipc.ts` variant routing on `OrchestratorOutputSchema`; populates `cardContextCache` on card emission.

### Execution sequence (locally chosen, dependency-driven)

`F1 → F3 → F4 → F5 → F2`

- F1 first: per operator brief; touches no shared files.
- F3 next: isolated daemon-client extension; no cross-followup deps.
- F4 before F5/F2: F5 calls `cardContextCache.set(...)` (cache must exist as a singleton); F2's sentinel imports `cardContextCache` from `./card-context-cache.js`.
- F2 last: main.ts sentinel imports F4's singleton + calls existing `registerCardIpcHandlers` (already exported from `card-ipc.ts` per MB-T07 GREEN).

---

## §2 Files owned + files NOT owned

### Owned (extended or new)

- `packages/dispatch-workstation/src/main/card-ipc.ts` (existing — extension only if needed for F4 wiring; otherwise untouched)
- `packages/dispatch-workstation/src/main/card-bridge.ts` (new — webview preload, F1)
- `packages/dispatch-workstation/src/main/card-context-cache.ts` (new, F4)
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` (extended — F5 emitter integration)
- `packages/dispatch-workstation/src/main/http-daemon-client.ts` (extended — F3 postAudit)
- `packages/dispatch-workstation/scripts/build-card-bridge.mjs` (new, F1)
- `packages/dispatch-workstation/test/unit/wiring-cards/*` (new test directory)
- `packages/dispatch-workstation/package.json` (only the build script line; no other field edits)
- `docs/cairn-coordination/batch-6/session-B-wiring-cards.md` (this file)
- `docs/FOLLOWUPS.md` (only the 5 followup-resolution lines for the followups I own)

### Shared (per main.ts coord contract §2)

- `packages/dispatch-workstation/src/main/main.ts` — sentinel-marked `// === MB-T07 card wiring ===` region only. Per operator patch 2, the sentinel covers both new imports at the top of the file AND the register call inside the existing register-handler block.
- `packages/dispatch-workstation/src/main/workstation-shell.html` — `<webview preload="...">` attribute on `<webview id="kanban-webview">` only. (Path corrected from scaffold §1; see §0 deviation 2 above.) Session C edits a separate `#console-tile-grid` region — disjoint.

### Explicitly NOT owned

- `packages/dispatch-workstation/src/main/spawn-*` (Session A)
- `packages/dispatch-workstation/src/main/binary-resolver.ts` (Session A new file)
- `packages/dispatch-workstation/src/onboarding/*` (Session C)
- `packages/dispatch-workstation/src/console-panel/*` (Session C)
- `packages/dispatch-workstation/src/main/onboarding-mount.ts`, `console-mount.ts` (Session C new files)
- `packages/dispatch-workstation/scripts/build-onboarding.mjs` (Session C new file)
- `docs/cairn-coordination/batch-6/session-{A,C}-*` (read-only reference)

If unowned territory shows in `git status --short`: HALT, do not stage, surface here in §4.

---

## §3 main.ts coord contract status (Session B + Session C only)

Acknowledged. Coordination scaffold §2.2 ordering: **Session B commits its main.ts edit FIRST**, before Session C pushes. Operator-relay enforces by gating Session C's push.

**Operator patches applied to brief:**

- **Patch 1 (F4):** `card-context-cache.ts` exports BOTH the `CardContextCache` class AND a `cardContextCache` singleton instance. Both `main.ts` and `coarchitect-ipc.ts` import the same singleton — no instantiation plumbing in main.ts beyond the import + sentinel region.
- **Patch 2 (F2):** sentinel-marked region in main.ts covers BOTH imports at top of file AND the register call. Reuses existing `httpDaemonClient` (from COARCH-T03 commit `7f15c78`); will verify pre-edit, halt if assumption wrong.

**Pre-commit territory check** for the F2 main.ts commit: `git status --short` will show only the patched files. Per-path `git add` only.

---

## §4 Cross-session findings

### 2026-05-03 — F1 pre-write contract reconciliation

Reading existing GREEN-shipped files surfaced six points where the operator session-start brief and patches differ from the actual file contracts. None block F1 (which has decided-by-existing-code resolutions); items §4.1, §4.2, §4.4 will block F2/F4 if not resolved by the time those followups land. Surfacing now so operator-relay can arbitrate while F1 + F3 are in flight.

**§4.1 (will bite F2): `CardIpcDeps` field name is `cardContext`, not `contextLookup`.**

Operator patch 2 prescribes the F2 sentinel block with `contextLookup: cardContextCache`. But the existing `CardIpcDeps` interface (`packages/dispatch-workstation/src/main/card-ipc.ts:47-59`, frozen by MB-T07 GREEN at commit `b45b93b`) names the field `cardContext`. As prescribed, the sentinel won't compile. KNOWN. Recommendation: F2 sentinel uses `cardContext: cardContextCache`.

**§4.2 (will bite F2): `ipcOn` is required in `CardIpcDeps` and missing from operator patch 2 sentinel.**

`CardIpcDeps.ipcOn` (lines 53-57) has no default; production wiring must pass `(channel, listener) => ipcMain.on(channel, listener)`. `ipcMain` already imported in `main.ts:8`. KNOWN. Recommendation: F2 sentinel becomes:
```
import { ipcMain } from 'electron';   // already imported in main.ts
import { cardContextCache } from './card-context-cache.js';
import { registerCardIpcHandlers } from './card-ipc.js';

// === MB-T07 card wiring (Session B / Batch 6 / wiring-cards) ===
registerCardIpcHandlers({
  daemonClient: httpDaemonClient,
  cardContext: cardContextCache,
  ipcOn: (channel, listener) => ipcMain.on(channel, listener),
});
// === end MB-T07 card wiring ===
```

**§4.3 (decides F1): IPC channel namespace is `card:*`, not `workstation:card-*`.**

Operator brief F1 says webview emits via `ipcRenderer.send('workstation:card-approved', payload)` etc. But `card-ipc.ts:193,209,220` (frozen by MB-T07 GREEN at `b45b93b`) listens on `'card:approved'`, `'card:declined'`, `'card:multi-choice-selected'`. GREEN-shipped contract is the source of truth (frozen code wins). KNOWN. F1 implementation will emit on `card:*`.

**§4.4 (will bite F4): `CardContextLookup.get` returns `CardContext | null`, not `CardContext | undefined`.**

Operator brief F4 + operator patch 1 say `get(card_id) returns CardContext or undefined`. But `CardContextLookup.get` (`card-ipc.ts:39-41`) returns `CardContext | null`. KNOWN. Recommendation: F4 implements `CardContextCache.get(card_id): CardContext | null` to match the GREEN-frozen `CardContextLookup` interface.

**§4.5 (decides F1): preload path is sibling-relative `./card-bridge.cjs`, not `./dist/main/card-bridge.cjs`.**

Operator brief F1 step 4 says `<webview preload="./dist/main/card-bridge.cjs">`. But `main.ts:30` loads workstation-shell.html from `dist/main/workstation-shell.html` (`build-shell.mjs` copyFile target), so the correct sibling-relative path from the loaded HTML to the built preload is `./card-bridge.cjs`. The brief's value would resolve to `dist/main/dist/main/card-bridge.cjs` and fail. KNOWN as path resolution.

SPECULATIVE follow-up: per Electron `<webview>` docs, the `preload` attribute may require an absolute `file:` URL rather than a relative path. F1 will write the static relative form (`./card-bridge.cjs`) first as the simplest path. If smoke/dogfood validation shows the webview preload doesn't load, fallback is to set `preload` programmatically from the existing inline `<script>` in workstation-shell.html via `new URL('./card-bridge.cjs', window.location.href).href`. The fallback adds one line inside the existing inline `<script>`, which expands my workstation-shell.html territory beyond the §2-stated "attribute on the webview element only" — flagging now in case operator-relay wants to pre-bless the territory expansion or prefer the programmatic-set form on first pass.

**§4.6 (decides F1 structure): card-bridge implementation splits into factory + entry.**

Brief F1 step 1 says "Pattern after existing console-bridge.ts" (a factory) and "Exposes window.cardBridge" (a preload entry's job). Two layers. Decision:
- `src/main/card-bridge.ts` — factory + types (no Electron import); unit-testable.
- `src/main/card-bridge-preload.mts` — entry: imports factory + Electron, calls `contextBridge.exposeInMainWorld('cardBridge', makeCardBridge(ipcRenderer))`.

`build-card-bridge.mjs` esbuild input = the `.mts` entry, output = `dist/main/card-bridge.cjs`. This adds one file (`card-bridge-preload.mts`) beyond the brief's stated set, mirroring the console-bridge.ts ↔ preload.mts pattern. Surfaced for review; will rebase if operator-relay prefers a single-file approach.

### Operator arbitration requested

§4.1 + §4.2 (F2 sentinel) and §4.4 (F4 return type) need explicit operator response before F2/F4 implementation. F1 + F3 + F5 unblocked; will continue. Pre-arbitration F2/F4 hold-state will manifest as task #6 / task #4 sitting at "ready to start RED" until response received in coord file or new prompt.

If operator-relay arbitrates differently on §4.3 (e.g. "rename existing `card:*` channels to `workstation:card-*` for namespace consistency"), F1 work must rebase on the new contract. KNOWN risk; will halt + redo if so directed.

---

## §5 Session-end summary

Pending session end.

---

## Session-start log

### 2026-05-03 — Session B start

- Repo HEAD: `89cfb955724c3ab1bcec502cd0d0da67c5794e7c`
- Branch: `session-B/wiring-cards` (ahead/behind 0/0 vs `origin/main`; upstream quirk noted §0 item 4)
- §0 staging: 5/5 satisfied with two execution deviations recorded (coord file self-created from §3 template; `workstation-shell.html` path correction).
- Plan: F1 → F3 → F4 → F5 → F2 → FOLLOWUPS.md → session-end test suite.
- Halt-discipline events at start: 0.
- Cross-session findings at start: 0.
