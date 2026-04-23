# DAEMON-S02 — fs.watch / fsevents on macOS

**Status:** KNOWN (spike passed 2026-04-23)
**Scope:** Phase 2 daemon file-watching for HANDOFF.md + git HEAD refs per CONDUCTOR_API_CONTRACT.md §5.3
**Spike script:** `packages/dispatch-daemon/spikes/DAEMON-S02-fsevents.ts`

## Decision

**Use native `node:fs.watch` (no third-party dep like chokidar).** Watch parent DIRECTORIES, not single files. Filter events by filename in the handler.

Patterns required for daemon:
- **For HANDOFF.md:** watch `<cwd>/` and filter for `filename === 'HANDOFF.md'` in the handler
- **For git commit_landed:** watch `<cwd>/.git/refs/heads/` and ignore `.lock` filenames
- **Debounce** downstream event emission (20-50ms) since file writes can surface as multiple fs events

## Rationale

`fs.watch` handles every use case the daemon has. Spike verified:
- Direct writes, atomic tmp+rename writes, and git ref updates all fire reliably
- Concurrent file activity in sibling directories produces ZERO spurious events in the watched dir (FSEvents respects path scope)
- Watcher is not starved under concurrent noise — real edits still fire

Adding `chokidar` (the common macOS-workaround library) would be over-engineering for v2 since native behavior meets every probe's needs. If stress-testing in production surfaces reliability issues (missed events under high load), chokidar is a one-line swap at that point.

## Probes and results

All 6 probes pass on Node 20 / darwin arm64:

| ID | Probe | Result |
|---|---|---|
| P1 | Direct write to HANDOFF.md → watcher fires | ✓ 1 event, `rename:HANDOFF.md` |
| P2 | Atomic write (tmp + rename) → fires for final filename | ✓ 2 events: `rename:HANDOFF.md.tmp`, then `rename:HANDOFF.md` |
| P3 | 5 rapid writes → count events (coalescing) | ✓ 5 writes → 3 events (partial coalescing observed) |
| P4 | `.git/refs/heads/` watch fires on `git commit` | ✓ 5 events, filenames `["main.lock", "main", "main.lock", "main", "main"]` |
| P5 | 500 files in SIBLING dir → no spurious in watched dir | ✓ 0 events (FSEvents path-scoped as expected) |
| P6 | HANDOFF.md edit under concurrent sibling load → still fires | ✓ 1 event, filename `HANDOFF.md` |

## KNOWN facts produced by this spike

### 1. Event types on macOS (Node 20)

Node's `fs.watch` on macOS reports `eventType: 'rename'` for most file operations — including file creation, rename, and (surprisingly) direct writes from `fs.writeFile`. Do NOT treat `'change'` vs `'rename'` as semantically meaningful on macOS. Treat any event for the watched filename as "something happened; re-stat."

### 2. Atomic-write pattern surfaces two events

An atomic write via tmp + rename (the pattern `registry/write.ts` uses) surfaces as:
1. Event for `HANDOFF.md.tmp` (tmp created)
2. Event for `HANDOFF.md` (rename target appears)

Daemon must filter the handler to only care about the FINAL filename. Simple check: `if (filename === 'HANDOFF.md') { ... }`.

### 3. Writes can coalesce (or not) unpredictably

5 writes within 100ms produced 3 events in this run. Other runs may produce 1, 2, or 5. Coalescing is FSEvents-level and timing-dependent. **Daemon MUST debounce** downstream event emission — a reasonable default is 50ms:

```ts
let pending: NodeJS.Timeout | null = null;
watcher.on('event', () => {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    emit('handoff_written', ...);
  }, 50);
});
```

Debounce trades latency (up to debounce-window) for guaranteed single-emission per burst. 50ms is imperceptible to the operator and absorbs typical write bursts.

### 4. Git commits fire TWO kinds of events on refs/heads/

`git commit` updates `.git/refs/heads/main` atomically via a `.lock` file. The watcher sees:
- `rename:main.lock` (lock created)
- `rename:main` (ref file replaced)
- `rename:main.lock` (lock released)
- `rename:main` (possibly file perms or atime changes)

Daemon must filter:
- Ignore `filename.endsWith('.lock')`
- On a `main` / branch name event, `fs.readFile` the ref to get the new commit SHA
- Shell `git -C <cwd> log -1 --format="%s %H"` (or equivalent) to enrich the event with subject + full SHA for the `commit_landed` data shape per §5.3

Debouncing (50ms) absorbs the multiple non-lock events into a single `commit_landed` emission.

### 5. FSEvents is path-scoped — no cross-directory pollution

**The big concern from operator's §5.3 ack is resolved: heavy fs activity in a sibling directory (500 files, approximating pnpm install's file-linking tail) produces ZERO events in the watched directory.** fsevents respects path boundaries; no spurious fires bleed across sibling dirs.

This means:
- Daemon watching `<cwd>/` for HANDOFF.md is unaffected by `<cwd>/node_modules/` activity (since node_modules is a subdirectory, non-recursive watch ignores it entirely)
- Multiple watched sessions don't cross-contaminate even if their cwds share a parent
- Operator can run `pnpm install` in one project while another project's daemon-watched session is live

### 6. Watcher is not starved under concurrent noise

P6 verified: under 500-file sibling load, a real HANDOFF.md write still surfaces as an event in the watched dir. No event loss, no delay beyond normal FSEvents latency (~100-200ms).

## Patterns locked in for daemon implementation

### Watch pattern (per-session)

```ts
import { watch } from 'node:fs';

function watchSession(cwd: string, onHandoff: () => void, onCommit: (branch: string) => void) {
  // Watch HANDOFF.md's directory, filter by filename
  const handoffWatcher = watch(cwd, { persistent: true, recursive: false }, (_eventType, filename) => {
    if (filename === 'HANDOFF.md') {
      debounce('handoff', 50, onHandoff);
    }
  });

  // Watch .git/refs/heads/, ignore .lock files
  const refsPath = join(cwd, '.git', 'refs', 'heads');
  const gitWatcher = watch(refsPath, { persistent: true, recursive: false }, (_eventType, filename) => {
    if (filename && !filename.endsWith('.lock')) {
      debounce(`commit:${filename}`, 50, () => onCommit(filename));
    }
  });

  return () => {
    handoffWatcher.close();
    gitWatcher.close();
  };
}
```

### Debounce utility (daemon-owned)

```ts
const pending = new Map<string, NodeJS.Timeout>();
function debounce(key: string, ms: number, fn: () => void) {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    fn();
  }, ms));
}
```

### Graceful shutdown

Both watchers' `.close()` must be called during daemon shutdown to release fsevents resources. Pattern: maintain a `Set<() => void>` of cleanup handlers, called from the SIGTERM / SIGINT handler.

## Tradeoffs and gotchas

- **Recursive watches on macOS.** `recursive: true` works on macOS but has historically been less reliable. Daemon does not need recursive — every watched path is a known flat directory (HANDOFF.md's dir, or `.git/refs/heads/`). Avoid recursive.
- **Git worktrees / submodules.** `git commit` in a worktree may update a different refs path than `<cwd>/.git/refs/heads/`. Not tested in this spike. Followup if session repos use worktrees. Most fd v1 sessions are simple single-worktree repos; unlikely to matter for v2.
- **Branch names with `/` in them.** `refs/heads/feature/foo` creates a subdirectory. Non-recursive watch on `refs/heads/` would miss these. Followup: either enable `recursive: true` for git refs, or watch by walking the tree. For v2, assume flat branch names (main, master, feature-X without slash); document as a known limitation.
- **Missing `.git/refs/heads/`.** If a session's `cwd` isn't a git repo, or refs/heads doesn't exist yet (fresh init, no commits), the watcher setup will throw. Daemon must wrap in try/catch and either skip git watch or create/retry when refs appear.
- **File-instead-of-directory-watch.** `fs.watch(singleFile)` works on macOS but has poorer behavior (closed watcher when file is replaced via rename). Always watch the PARENT directory and filter by filename.

## Cross-session impacts

None surfaced by this spike. FSEvents path-scoping (finding #5) is specifically reassuring for cross-project isolation: Session B's web UI running `pnpm install` in its own package wouldn't pollute daemon watchers on unrelated projects.

## Followups (not blocking, file for ticket phase)

1. **Git worktree / submodule support** — DAEMON-T11 (git log watch) should document this as out-of-scope for v2 or add handling if operator surfaces a real use case.
2. **Branch names with `/`** — document limitation in DAEMON-T11 or enable recursive watch for `refs/heads/` if the restriction bites.
3. **Missing `.git/` directory handling** — DAEMON-T11 must handle non-git session cwds gracefully (skip commit_landed emission for that session; no error).
4. **Watcher-lifecycle cleanup on session state transitions** — per contract §4.3 / §6, `killed` → watcher should close; `paused` → watcher continues running (events coalesced), but daemon doesn't emit until `armed` resumes. Interaction with debounce needs careful design.

## Provenance

- Contract §5.3 — `handoff_written` and `commit_landed` event types and data shapes
- Contract §10.3 — anti-fabrication: fsevents behavior must be spiked (this ADR converts MODELED → KNOWN)
- Operator ack on S02 scope — included concurrent-pnpm sibling-noise test case (P5/P6)
