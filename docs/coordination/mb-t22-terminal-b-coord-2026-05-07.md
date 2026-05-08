# MB-T22 Terminal B — Parallel-Cairn Territory Declaration

**Date:** 2026-05-07
**Session:** Terminal B (4-session parallel-cairn run; A=MB-T21, B=MB-T22, C=MB-T26, D=MB-T27).
**Repo HEAD at WB1 start:** `934c0a8` (clean working tree; `git pull --ff-only` no-op).
**Decisions doc:** `docs/coordination/mb-t22-decisions-2026-05-07.md`.

---

## Why this doc exists

CLAUDE.md §4.3 (cross-session coordination) + `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1, FOLLOWUPS.md:196): in shared-working-tree parallel-cairn, the git index is process-shared. Per-path `git add` (CLAUDE.md §2.7) protects this session from sweeping other sessions' work; the atomic-chain commit pattern protects against intra-session race; this coord doc protects against **cross-session territory collisions** by declaring scope up front so A/C/D can pre-flight read it before staging adjacent files.

---

## Terminal B owned files (MB-T22 ladder)

### Created at WB1 (this commit)
- `packages/dispatch-workstation/src/chat-shell/commits-tab.tsx` — renderer stub (throws at render; lands at WB4 green).
- `packages/dispatch-workstation/src/chat-shell/commits-reader.ts` — main-process stub (throws on every export; lands at WB3 green).
- `packages/dispatch-workstation/test/unit/chat-shell/probe-04-multi-tab-api.spec.tsx` — RED multi-tab API probe.
- `packages/dispatch-workstation/test/unit/commits-reader/probe-01-parser-and-attribution.spec.ts` — RED reader probe.
- `packages/dispatch-workstation/test/unit/commits-tab/probe-01-render-and-grouping.spec.tsx` — RED commits-tab render probe.
- `packages/dispatch-workstation/tsconfig.json` — additive `files` array entry for `src/chat-shell/commits-reader.ts` (mirrors `src/coarchitect/daemon-client.ts` allow-list).
- `docs/coordination/mb-t22-decisions-2026-05-07.md` — operator-arbitrated dispositions.
- `docs/coordination/mb-t22-terminal-b-coord-2026-05-07.md` — this doc.

### Modified at WB2 (chat-shell multi-tab refactor)
- `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` — multi-tab API: `tabs: TabConfig[]` + `activeTabId` + `onTabChange`. Replaces `renderChatTab` slot. Closes `MB-F-T20-FAMILY-B-ADDITIONAL-TABS`.
- `packages/dispatch-workstation/src/chat-shell/mount.ts` — migrate single Chat tab to TabConfig array shape; preserves `coarchitectBridge` passthrough.
- `packages/dispatch-workstation/test/unit/chat-shell/probe-01-render-tests.spec.tsx` — migrate existing MB-T20 single-tab assertions to new API. Data-testid contract preserved verbatim (`chat-shell-tab-chat`, `chat-shell-tab-content`, etc.); only the props API changes.

### Modified/created at WB3 (reader + IPC + preload + main.ts)
- `packages/dispatch-workstation/src/chat-shell/commits-reader.ts` — real impl.
- `packages/dispatch-workstation/src/main/commits-ipc.ts` — NEW main-process IPC handler.
- `packages/dispatch-workstation/preload.mts` — additive `contextBridge.exposeInMainWorld('commitsBridge', ...)` line.
- `packages/dispatch-workstation/src/main/main.ts` — NEW sentinel zone `=== BEGIN: MB-T22 commits-ipc registration === / === END: MB-T22 commits-ipc registration ===`.

### Created at WB4 (commits-tab + integration test + smoke)
- `packages/dispatch-workstation/src/chat-shell/commits-tab.tsx` — real impl.
- `packages/dispatch-workstation/src/chat-shell/mount.ts` — TabConfig array gains a Commits entry.
- `packages/dispatch-workstation/test/integration/commits-reader/probe-01-fixture-repo.test.ts` — real `git init` fixture integration test.

### Modified at WB5 (docs)
- `docs/coordination/mb-t22-findings-2026-05-07.md` — NEW findings doc.
- `docs/FOLLOWUPS.md` — additive rows: `MB-F-T22-CHAT-SHELL-TAB-KEYBOARD-NAV`, `MB-F-T22-MULTI-REPO-COMMITS-VIEW`, `MB-F-T22-COMMIT-DETAIL-EXPANSION`, plus any impl-driven Tier 1/2.

---

## Terminal B explicitly NOT touched

| File | Why it matters |
|---|---|
| `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx` | Terminal A territory (MB-T21 Chat tab body content) |
| `packages/dispatch-workstation/src/coarchitect/*.ts` (other) | A's wider territory; B does not modify |
| `packages/dispatch-core/src/v3/schema.ts` | Frozen contract; Q-MBT22-1=a means no schema additions |
| `packages/dispatch-daemon/**` | Frozen WORKSTATION_CONTRACT.md §6; Q-MBT22-1=a means no daemon route additions |
| `packages/dispatch-cli/**` | Out of scope |
| `packages/dispatch-web/**` | Out of scope |

---

## Sentinel-zone discipline for WB2 multi-tab refactor

WB2 introduces multi-tab structure to `chat-shell.tsx`. Per CLAUDE.md §3.3, B will preserve **sentinel-friendly structure** so C and D can additively register header-bar render-prop slots without colliding:

Planned WB2 chat-shell.tsx structure (skeleton):
```tsx
export interface TabConfig {
  readonly id: string;
  readonly label: string;
  readonly render: () => ReactNode;
}

export interface ChatShellProps {
  readonly tabs: readonly TabConfig[];
  readonly activeTabId?: string;
  readonly onTabChange?: (id: string) => void;
  // === BEGIN: MB-T22 header-bar slot infrastructure ===
  // Header-bar render-prop slots reserved for C (MB-T26 cost meter)
  // and D (MB-T27 model mix). C and D add their own typed slot props
  // (e.g., renderCostMeterSlot?: () => ReactNode) inside their own
  // sentinel zones at MB-T26/MB-T27 WB2.
  // === END: MB-T22 header-bar slot infrastructure ===
}

export function ChatShell({ tabs, activeTabId, onTabChange }: ChatShellProps) {
  // === BEGIN: MB-T22 multi-tab core ===
  // Tab-strip + active-tab content rendering.
  // === END: MB-T22 multi-tab core ===
}
```

C and D's HALT 0 surfaces (per operator update) will define the exact slot shape — B does not commit to a specific render-prop signature beyond reserving the structural location.

---

## Atomic-chain commit pattern (every WB)

Per `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1):

```sh
git pull --ff-only && \
  git add <explicit-paths> && \
  git diff --cached --name-only | sort > /tmp/mb-t22-wbN-staged.txt && \
  diff /tmp/mb-t22-wbN-staged.txt <(printf "<paths>\n" | sort) && \
  git commit -m "..." && \
  git push origin main && \
  git log --oneline origin/main..HEAD
```

The `diff` step aborts the chain if the staged set diverges from the intended set (i.e. another session staged something between B's pre-stage and B's commit). Q7 self-check answered post-commit against `git log -1 --name-only`.

---

## §0 staging verification protocol (every WB)

Before each WB commit, B reads:
1. `docs/coordination/mb-t21-*` — A's coord docs (any new territory claims that overlap chat-shell)
2. `docs/coordination/mb-t26-*` — C's coord docs
3. `docs/coordination/mb-t27-*` — D's coord docs
4. `git log --oneline origin/main..main` — verify no unpushed local commits from another session
5. `git status --short` — verify the only unstaged changes are B's work

If a foreign coord doc declares overlap, halt and surface to operator.

---

## Cross-session contact points

- **MB-F-T20-FAMILY-B-ADDITIONAL-TABS** (FOLLOWUPS.md:128) closes via this ticket. After B's WB2, the closure row updates with WB2 commit SHA + closure description. C and D are downstream consumers — neither closes this followup.
- **Operator confirmed (2026-05-07):** B is single-source-of-authorship for the multi-tab API. C and D do not extend `chat-shell.tsx` multi-tab structure; they only add header-bar render-prop slots in their own sentinel zones after B's WB2.
- **R-MBT22-1 mitigation:** existing MB-T20 probe-01 (7 single-tab tests) carries forward at WB2 via migration to new API (data-testid contract preserved). New probe-04 asserts multi-tab API. Runtime smoke (CLAUDE.md §4.6) re-runs at WB4.

---

## Surface to operator if
- Terminal A's coord doc declares any chat-shell.tsx ownership.
- Terminal C or D begins extending `chat-shell.tsx` multi-tab structure (vs. additive header-bar slots).
- preload.mts has unexpected diff content from C/D's parallel work that would conflict with the additive `commitsBridge` line.
- main.ts already contains a `MB-T22` or `MB-T26` or `MB-T27` sentinel zone authored by another session at the time of B's WB3 commit.
- Any frozen surface diff appears in `git status` that B did not author.
