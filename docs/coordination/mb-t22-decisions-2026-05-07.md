# MB-T22 Decisions — Commits tab (operator-arbitrated 2026-05-07)

**Ticket:** MB-T22 — Commits tab (Family-B chat-shell tab body).
**Phase 1 diagnose:** `/tmp/mb-t22-diagnose.md`.
**Operator paste:** 2026-05-07 — Q-MBT22-1..8 dispositions and 5-WB ladder ack.
**Terminal:** B in 4-session parallel-cairn run (A=MB-T21, C=MB-T26, D=MB-T27).

## Q-MBT22-1 — Daemon endpoint vs. workstation `child_process` for git log
**Disposition: a — workstation `child_process` (Option A from Phase 1 §IV).**

Rationale (operator-confirmed):
- Frozen surfaces preserved (no `WORKSTATION_CONTRACT.md §6` extension; no `dispatch-core/src/v3/schema.ts §1-§13` addition).
- Mirrors established workstation pattern (`coarchitect/head-watcher.ts` already runs `execSync('git rev-parse HEAD', { cwd: repoRoot })`; CLAUDE.md §3.5 endorses workstation-side IO via `node:fs` / `node:child_process`).
- `BuildDocConfig.repoRoot` (already plumbed via `readBuildDocConfig()`) is the primary-repo source of truth; no new persistence.
- Lower latency, works offline, smaller test surface, no auth boilerplate.
- Multi-machine aggregation is explicitly out-of-scope per ticket; if it ever lands, file a follow-on ticket and migrate then.

## Q-MBT22-2 — File location
**Disposition: a — `src/chat-shell/commits-tab.tsx` + `src/chat-shell/commits-reader.ts`.**

Co-located with the consumer tab-host (Family-B grouping). Architecturally split by process:
- `commits-tab.tsx` — renderer (JSX, browser bundle via `build-chat-shell.mjs`, excluded from `tsc` like all chat-shell renderer surfaces).
- `commits-reader.ts` — main-process (no JSX, plain TypeScript). Added to `tsconfig.json` `files` array (mirrors `src/coarchitect/daemon-client.ts` allow-list pattern) so `tsc` typechecks it despite parent dir being excluded.
- `commits-tab.tsx` may `import type { CommitGroup, CommitEntry }` from `./commits-reader.js` — type-only imports are erased by esbuild and do not pull `node:child_process` into the renderer bundle.

## Q-MBT22-3 — ChatShell multi-tab extension scope
**Disposition: a — fold into MB-T22 WB2.** Closes `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` (Tier 2, FOLLOWUPS.md:128).

WB2 lands the entire multi-tab API atomically:
```ts
export interface TabConfig {
  readonly id: string;
  readonly label: string;
  readonly render: () => ReactNode;
}
export interface ChatShellProps {
  readonly tabs: readonly TabConfig[];
  readonly activeTabId?: string; // defaults to tabs[0]?.id
  readonly onTabChange?: (id: string) => void;
}
```

No backwards-compat shim for `renderChatTab` — single call-site in `mount.ts` migrates atomically (CLAUDE.md "no backwards-compatibility hacks").

`data-testid` contract preserved additively:
- `chat-shell-root` (existing) — outer container.
- `chat-shell-tab-strip` (existing) — `role=tablist`.
- `chat-shell-tab-{id}` per tab (today: `chat-shell-tab-chat`; MB-T22 adds `chat-shell-tab-commits`).
- `chat-shell-tab-content` (existing) — `role=tabpanel`, renders active tab's `render()`.

Existing `test/unit/chat-shell/probe-01-render-tests.spec.tsx` (MB-T20 single-tab render) migrates at WB2 green to pass `tabs={[{id:'chat',label:'Chat',render:...}]}`. The data-testid assertions (`chat-shell-tab-chat`, etc.) are preserved verbatim.

## Q-MBT22-4 — Keyboard nav (arrows / Home / End)
**Disposition: a — defer to v3.1 polish followup.**

Initial impl ships click-only tab switching. WB5 files `MB-F-T22-CHAT-SHELL-TAB-KEYBOARD-NAV` (Tier 3 — accessibility polish).

## Q-MBT22-5 — Session-attribution heuristic precedence
**Disposition: a.**

Precedence (first match wins):
1. **Subject-line ticket prefix** (primary): regex `^(red|green|spike|contract|refactor|docs|chore)(?:\([^\)]*\))?(?:\s|:|\()MB-T(\d+)` against the commit subject. Match → `"MB-T<NN>"`. (Real example: `green(MB-T13): WB6 ...` → `MB-T13`.)
2. **Body `sess-mbt*` reference** (secondary): regex `/\bsess-mbt(\d+)\b/i` against the commit body. Match → `"MB-T<NN>"`. (Real example: body mentions `sess-mbt13 WB7` → `MB-T13`.)
3. **`"unknown"`** otherwise.

Pre-convention commits without either signal correctly read `"unknown"`. The subject-prefix regex is intentionally permissive on the parenthetical group so it matches both `green(MB-T13):` and any future `green(MB-T22) WB1:` shape.

## Q-MBT22-6 — Time-ago auto-update mechanism
**Disposition: a — component-local `useEffect` + `setInterval(60_000)`.**

`useEffect` cleanup clears the interval on unmount. When the user switches to another tab, ChatShell unmounts the inactive tab body (active-tab-only rendering per Q-MBT22-3 contract: `chat-shell-tab-content` renders `tabs.find(t => t.id === activeTabId)?.render()`), so the interval is automatically cleaned up while the tab is hidden. No memory leak.

## Q-MBT22-7 — Preload bridge import shape
**Disposition: a — static preload bridge, `window.commitsBridge` mirroring `window.coarchitectBridge`.**

Additive line in `packages/dispatch-workstation/preload.mts`:
```ts
contextBridge.exposeInMainWorld('commitsBridge', {
  listCommits: (opts: { limit?: number }) => ipcRenderer.invoke('commits:list', opts),
});
```

Renderer-side type:
```ts
declare global {
  interface Window {
    commitsBridge?: {
      readonly listCommits: (opts: { limit?: number }) =>
        Promise<{ groups: readonly CommitGroup[]; error?: string }>;
    };
  }
}
```

Bridge optional — `commits-tab.tsx` renders empty-state row when `window.commitsBridge` is undefined (test-mode + fresh-install paths).

## Q-MBT22-8 — Integration test fixture
**Disposition: a — real `git init` in `tmpdir` + scripted commits.**

Integration probe at `test/integration/commits-reader/probe-01-fixture-repo.test.ts` (note `.test.ts` per CLAUDE.md §3.6 integration suffix). Uses `node:os.tmpdir()` + `node:fs.mkdtempSync` to create an isolated repo, runs `git init` + a deterministic sequence of `git commit --allow-empty -m "<subject>" -m "<body>"` with controlled `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` env vars to populate Today/Yesterday/Older buckets. Asserts `readCommits()` output matches expected groups, attributions, and counts. afterAll cleans the tmpdir via `rmSync(tmpdir, { recursive: true, force: true })`.

## 5-WB ladder (operator-acked)

| WB | Type | Scope | Files (territory; coordinated with A/C/D) |
|---|---|---|---|
| **WB1 (this commit)** | red | Scaffold + decisions doc + coordination doc + 3 failing probes (multi-tab API; reader pure-fns; commits-tab render) | `src/chat-shell/commits-tab.tsx` (stub), `src/chat-shell/commits-reader.ts` (stub), `tsconfig.json` (allow-list `commits-reader.ts`), 3 probes, 2 docs |
| **WB2** | green | ChatShell multi-tab API (`tabs: TabConfig[]` + `activeTabId` + `onTabChange`) + `mount.ts` migration to TabConfig array; closes `MB-F-T20-FAMILY-B-ADDITIONAL-TABS`; existing MB-T20 probe-01 migrates to new API; sentinel-friendly structure for future C/D header-bar slot extensions | `src/chat-shell/chat-shell.tsx`, `src/chat-shell/mount.ts`, `test/unit/chat-shell/probe-01-render-tests.spec.tsx` (migrate) |
| **WB3** | green | `commits-reader.ts` impl (execFile git log + NUL-delimited parser + `groupByDay` + `attributeSession` per Q-MBT22-5); `src/main/commits-ipc.ts` IPC handler; preload.mts additive `commitsBridge`; `main.ts` `=== BEGIN: MB-T22 commits-ipc registration ===` sentinel zone | `src/chat-shell/commits-reader.ts`, `src/main/commits-ipc.ts` (NEW), `preload.mts`, `src/main/main.ts` |
| **WB4** | green | `commits-tab.tsx` render impl (groups + rows + time-ago + 60s interval); `mount.ts` registers commits TabConfig entry; runtime smoke (CLAUDE.md §4.6 — Electron launch + WINDOW_READY ≤10s); integration test against `git init` tmpdir fixture | `src/chat-shell/commits-tab.tsx`, `src/chat-shell/mount.ts`, integration probe |
| **WB5** | docs | Findings doc + followups: `MB-F-T22-CHAT-SHELL-TAB-KEYBOARD-NAV` (Tier 3), `MB-F-T22-MULTI-REPO-COMMITS-VIEW` (Tier 3, defer until multi-machine warranted), `MB-F-T22-COMMIT-DETAIL-EXPANSION` (Tier 3, deferred per ticket out-of-scope), and any incident-driven Tier 1/2 surfaced during impl | `docs/coordination/mb-t22-findings-2026-05-07.md`, `docs/FOLLOWUPS.md` |

## Frozen-contract assessment

| Surface | Touched? |
|---|---|
| `REGISTRY.md §2` | NO |
| `CONDUCTOR_API_CONTRACT.md` | NO |
| `WORKSTATION_CONTRACT.md §6` | NO (Q-MBT22-1=a — workstation-side reads only) |
| `dispatch-core/src/v3/schema.ts §1-§13` | NO |

`preload.mts` additive `commitsBridge` exposure: operator-confirmed additive; no separate ack cycle; standard atomic-chain commit.

## Parallel-cairn coordination (operator-supplied 2026-05-07)

| Terminal | Ticket | Territory | Conflict with B? |
|---|---|---|---|
| A | MB-T21 | `coarchitect/chat-panel.tsx` (Chat tab body content) | Disjoint — A consumes the WB2 multi-tab API but does not extend it |
| B (me) | MB-T22 | `src/chat-shell/{chat-shell.tsx,mount.ts,commits-tab.tsx,commits-reader.ts}` + `src/main/commits-ipc.ts` + `preload.mts` (additive line) + `main.ts` (new sentinel zone) + `docs/FOLLOWUPS.md` (additive rows) | n/a |
| C | MB-T26 | header-bar slot in chat-shell.tsx (cost meter render-prop) | Adjacent — C consumes B's WB2 multi-tab API + adds a header-bar render-prop slot in a separate sentinel zone (`=== BEGIN: MB-T26 cost-meter slot ===`) |
| D | MB-T27 | header-bar slot in chat-shell.tsx (model mix render-prop) | Adjacent — same pattern as C, separate sentinel zone (`=== BEGIN: MB-T27 model-mix slot ===`) |

Operator confirmed B is the **single source of authorship** for the multi-tab API. WB2 must preserve sentinel-friendly structure so C/D additions are cheap. WB2 will leave a documented extension point (header-bar render-prop slot infrastructure) ready for C/D to fill in.

## Atomic-chain commit methodology

Per `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1) — every cairn-grammar commit chains in a single shell invocation:

```sh
git pull --ff-only && \
  git add <explicit paths> && \
  git diff --cached --name-only | sort > /tmp/mb-t22-wbN-staged.txt && \
  diff /tmp/mb-t22-wbN-staged.txt <(printf "<paths>\n" | sort) && \
  git commit -m "..." && \
  git push origin main && \
  git log --oneline origin/main..HEAD
```

Q7 self-check answered against post-commit `git log -1 --name-only` (not pre-commit `git status` snapshot).
