# foxworks-dispatch — Conductor / Cairn methodology

This file is auto-loaded by Claude Code for every session in this repo. It encodes the methodology, conventions, and frozen-contract surfaces that govern all forward work. Read fully before any task.

## §1 — Authority

This file is operator-authored (Joshua Seppich) and tracks the state of the Conductor v3.0 build. Updates to this file are themselves operator-arbitrated.

**Frozen contract surfaces** (operator-arbitrated only; never CC-modified):
- `REGISTRY.md §2` — Registry binary contracts
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — Conductor v2/v3 API contract (committed at `3ddca60`)
- `packages/dispatch-core/src/v3/schema.ts` §1-§13 — Zod schema spine for all cross-package contracts
- `docs/build-docs/WORKSTATION_CONTRACT.md` §6 — IPC + endpoints

**If CC encounters a frozen surface in the path of necessary work**, halt and surface to operator. Do not modify. Mechanical translation of frozen arbitrations into derived code (e.g., schema-derived types) is permissible under tight scope, then operator-reviewed.

## §2 — Cairn methodology (always operative)

Cairn is the methodology that makes solo Registry-scale work tractable. It encodes anti-fabrication discipline, frozen-contract awareness, halt gates, and verifiable behavior cycles.

### §2.1 Anti-fabrication
Read actual source before claiming what it does. For code questions: read the file. For project state: read project files. For past context: search past conversations. Never claim what code does without verification.

Anti-fabrication extends to infrastructure: single-command failures (git fetch, network calls) get verified via independent commands (`ls-remote`, `push --dry-run`, `status`), not assumed to mean what they superficially indicate.

### §2.2 Confidence labels
Every factual claim carries an explicit or implicit confidence label:
- **`[KNOWN]`** — observed in this session via tool invocation
- **`[MODELED]`** — reasoned from observed facts plus a stated model
- **`[SPECULATIVE]`** — hypothesis without evidence

MODELED claims become KNOWN only by evidence, never by repetition. Use these labels in commit bodies, decision docs, and surfaces to operator.

### §2.3 Cairn commit grammar
The five-verb grammar is the minimum vocabulary for auditable commit logs:
- **`red:`** — failing test or contract spec authored
- **`green:`** — implementation that makes a red test pass
- **`spike:`** — exploratory work; cannot assert KNOWN evidence outside spike scope
- **`contract:`** — modifies a frozen surface (triggers §2.4 arbitration)
- **`refactor:`** — asserts behavior preservation; subject to §2.1 verification

Subject format: `<verb>(<ticket>): <short description>` e.g. `green(MB-T12): WB6 — tile-grid.tsx top-level grid + N-tile rendering + unit tests`.

Other prefixes (`docs:`, `chore:`, `merge:`) are permitted for housekeeping but don't count as cairn-grammar commits.

### §2.4 Self-check Q1-Q9 (commit body)
Every cairn-grammar commit body includes a self-check block answering these 9 questions per `CONDUCTOR_API_CONTRACT.md §10.5`:

API verified by spike?
Test exercises behavior or MOCKS?
If implementation deleted, test passes?
Anything outside contract spec?
Modified contract without approval?
Any unlabeled claim in commit body?
Touched files another parallel session might modify?
Bypass PATCH /v2/sessions/:name/state?
Work during unauthorized halt?


Q7 is answered against actual `git status` output, not memory.

### §2.5 Halt discipline
When in a halt state — waiting at a pre-registration gate, blocked on upstream deliverable, paused for arbitration — "halt" means literally nothing happens. No reads. No file inventories. No "preparatory absorption." No "useful prep while waiting."

The temptation to do useful prep during a halt IS the signal to surface to operator and ask whether the halt scope should be relaxed — not to act on it.

If halt feels productively-wasteful, surface to operator with: what work would be useful, what risks doing it, what risks NOT doing it. Operator decides whether to relax halt scope.

### §2.6 Per-commit-push discipline
After each cairn-grammar commit:
1. Push to origin immediately
2. Verify via `git log --oneline origin/main..HEAD` returning empty
3. Then proceed to next WB

Local-only commits in parallel-cairn contexts are a discipline gap. Caught early via cross-session `§0` staging verification.

### §2.7 Per-path git add (shared-working-tree contexts)
`git add -A` in shared-working-tree parallel sessions is unsafe — sweeps another session's untracked work into the current commit.

**Always use explicit `git add <path>` for every staged file.** Pre-commit territory check via `git status --short`. Post-commit verification via `git log -1 --stat`.

### §2.8 Spike + ADR for external APIs
Any external API interaction whose behavior the agent has not personally observed requires a `spike:` commit followed by an ADR documenting observed behavior + confidence label + binding decision. Load-bearing for any code touching model providers, cloud services, third-party libraries with non-locally-verifiable contracts.

### §2.9 Bidirectional territory fences
Territory fences protect the work from session mistakes AND the session from operator mistakes. A misdirected operator instruction that crosses session territory should be refused, not interpreted. Surface concerns; wait for operator correction.

### §2.10 Frozen contracts
- **Operator-arbitrated decisions** (new contract authoring): operator-only.
- **Operator-supervised mechanical translation** (e.g., Zod schema files derived from frozen contract arbitrations): CC-delegable under tight scope, operator-reviewed before commit.

When in doubt, surface and ask. Never modify a frozen surface assuming the change is "obviously additive."

### §2.11 Outcome classifications
Use these honest framings (don't force "Improved" where evidence doesn't support it):
- Improved (binary flip + behavioral quality)
- Improved (fault recovery)
- No improvement + structural finding
- Improved (cost + clean composition)
- Capability enabled with known limitations
- No regression; wiring verified; improvement case not exercised
- Observability gap closed; capture validated; criterion refinement deferred

### §2.12 Followups over absorption
Real findings get filed as ticket-style entries in `docs/FOLLOWUPS.md` following the convention `MB-F-<DESCRIPTOR>`. Never silently absorbed into current ticket scope. Tier 1/2/3 classification with one-sentence rationale and discoverability anchor.

Format:
| MB-F-<NAME> | <body with closure path, rationale, tier, discoverability> | <surfaced-from> |

## §3 — Codebase conventions

### §3.1 Package layout
Five packages in `packages/`:
- `dispatch-core` — Zod schemas, transport, shared types. Smallest package; the contract spine.
- `dispatch-daemon` — HTTP daemon, registry, route handlers
- `dispatch-workstation` — Electron main process + renderer + IPC layers
- `dispatch-cli` — command-line interface
- `dispatch-web` — kanban webview UI

Every cross-package contract goes through `dispatch-core/src/v3/schema.ts`. Never duplicate schema definitions across packages.

### §3.2 dispatch-workstation file layout
Workstation source uses **flat directory convention** under `packages/dispatch-workstation/src/`:
- `main/` — Electron main process (IPC handlers, controllers, state stores)
- `console-panel/` — xterm.js renderer for tile body
- `coarchitect/` — coarchitect chat surface
- `audit-modal/` — audit modal renderer (separate BrowserWindow)
- `onboarding/` — onboarding renderer
- `error-display/` — error-display renderer
- `tile-grid/` — (MB-T12) tile-grid renderer

**Do NOT create `src/renderer/` or other nested category directories.** The flat convention is established; nesting breaks the pattern.

### §3.3 Sentinel-marked regions in main.ts
`packages/dispatch-workstation/src/main/main.ts` uses sentinel comment blocks for tracked region boundaries:
```typescript
// === BEGIN: Fix-X (description) ===
// ... region code ...
// === END: Fix-X ===
```

**Never modify code inside an existing sentinel zone unless the change is explicitly within that zone's scope.** Add new logic in NEW sentinel blocks (`=== BEGIN: MB-TXX <description> ===`) outside existing zones.

Current sentinel zones (verify with `grep -n "=== " packages/dispatch-workstation/src/main/main.ts` before editing):
- Fix-A (multiple sub-regions)
- Fix-B (spawn-result subscription)
- Fix-C (multiple sub-regions)
- Fix-92 (config/env)
- Fix-89 (menu rebuild)
- Probe-92 obs-infra (multiple sub-regions)
- Probe-92 KANBAN_EVAL
- Session-3 SHELL_EVAL

### §3.4 dispatch-core dist build discipline
Workstation imports use `dispatch-core/dist/v3/schema.js` paths (compiled artifacts), NOT `dispatch-core/src/v3/schema.ts` (source). TypeScript path-mapping resolves both at typecheck time, but Node ESM at runtime requires the actual `.js` artifact in `dist/`.

**After any merge to main that adds dispatch-core exports, run `pnpm --filter dispatch-core build` BEFORE running workstation typecheck.** Tracked at `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE`.

### §3.5 Persistence pattern
Workstation persists state via raw `fs.readFileSync`/`writeFileSync` of JSON files in `app.getPath('userData')`. Pattern lives at `packages/dispatch-workstation/src/main/splitter-state.ts` (35 lines, env-override via `MB_SPLITTER_STATE_DIR`).

**Mirror this pattern for all new persistence. Do NOT install electron-store** unless explicitly authorized.

### §3.6 Test file layout
Tests live at `packages/<pkg>/test/` with sub-directories:
- `test/unit/<feature>/` — pure-fn unit tests (vitest)
- `test/integration/<feature>/` — integration tests (real IPC, real daemon, real Electron where required)

Test files: `probe-NN-<descriptor>.spec.ts` (unit) or `probe-NN-<descriptor>.test.ts` (integration). Each WB typically adds one or more probes.

### §3.7 Build pipeline
Each renderer surface has its own esbuild script in `packages/dispatch-workstation/scripts/build-<name>.mjs` that bundles into `dist/<name>/renderer.js`. The package `build` script chains them. New tile/panel surfaces need a corresponding build script.

### §3.8 Coordination doc convention
Cross-session findings live at `docs/coordination/<session-name>-findings-<date>.md`. Decision docs at `docs/coordination/<ticket>-decisions-<date>.md`. Per-ticket findings at `docs/coordination/<ticket>-findings-<date>.md`.

## §4 — Workflow primitives

### §4.1 WB ladder pattern
Tickets decompose into Work Blocks (WBs), each one a verified-behavior cycle:
1. **Red** — author failing test
2. **Green** — implement minimum code to pass
3. **Self-check Q1-Q9** — fill out commit body
4. **Commit** with cairn-grammar prefix
5. **Push** to origin per §2.6

Typical ticket: 8-14 WBs single-session. Larger tickets split. Each WB is operator-reviewable independently.

### §4.2 HALT gates
Tickets are governed by HALT gates encoded in the prompt:
- **HALT 0** — pre-execution surface (Phase 1 diagnose, plan review)
- **Per-N-WB status surfaces** — every 3-4 WBs, surface progress for operator awareness
- **HALT 1** — pre-final-verification (before findings doc + last verification pass)
- **HALT 2** — pre-push-to-main (operator-arbitrated final commit + push)

Operator-arbitrated actions (commits to main, pushes, contract changes) ALWAYS get their own ack cycle. **Never chain operator-arbitrated actions behind verification commands.**

### §4.3 Cross-session coordination (parallel-cairn)
When multiple CC sessions run in parallel:
- Each session works in its own worktree (`~/Desktop/Automata/foxworks-worktrees/<session-name>/`)
- Cross-session coordination notes at `docs/coordination/<session-pair>-coord.md`
- Per-path `git add` mandatory (§2.7)
- Frozen contracts protect cross-session writes
- §0 staging verification at session start (read coordination notes before committing)

### §4.4 Verification ordering (multi-package)
For changes touching dispatch-core schemas:
1. `pnpm --filter dispatch-core build` (rebuild dist artifacts per §3.4)
2. Run affected test suites (scope to WB-relevant directories, not full suite per WB)
3. 5-package typecheck **one command at a time**, no `&&` chains:
pnpm --filter dispatch-core typecheck
pnpm --filter dispatch-daemon typecheck
pnpm --filter dispatch-workstation typecheck
pnpm --filter dispatch-cli typecheck
pnpm --filter dispatch-web typecheck
4. Full workstation suite at WB13 verification (final WB before findings)

### §4.5 Pre-existing test failures (current state)
Two known classes of pre-existing failures in workstation suite:
- `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2) — `test/unit/coarchitect-ipc/test_register_ipc_handlers.spec.ts:485` deterministically fails (real bug or stale mock)
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3) — 5 integration tests (daemon/MANUAL/Electron-gated) flake under standard pnpm test invocation

**Do NOT re-diagnose these per WB.** Note their existence in the WB13 verification surface as expected pre-existing failures. They will be addressed in dedicated tickets.

### §4.6 Runtime-launch smoke
Workstation merges that touch `src/main/*.ts` MUST include a runtime-launch smoke verification BEFORE merge to main:
pnpm --filter dispatch-workstation exec electron dist/main/main.js
Observe WINDOW_READY sentinel within ~10 seconds
ERR_MODULE_NOT_FOUND class bugs are invisible to typecheck + unit + integration suites. Tracked at `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE`.

## §5 — Active build state

### §5.1 Current ticket
**MB-T12 — Tile grid + auto-mount-on-spawn.** 14-WB ladder. Ships at completion: tile-grid React surface, drag-resize/swap/detach handlers, spawn auto-mount, ConsolePanel multi-mount fix.

Phase 1 diagnose at `/tmp/mb-t12-diagnose.md` (regenerate via Phase 1 prompt if missing).

### §5.2 Recently shipped (last 24h)
- `MB-T11` — orchestrator action tools + autopilot loop (merged at `69d7d29`)
- `MB-T13` — per-session approval policy + audit (merged at `61f3e83`)
- `MB-F-T11-T13-RESOLVER-STUB` — closed via shim wrapping real resolver (`e87fd22`)
- `MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX` — filed (`a94fecb`)
- `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` — filed (`185057a`)

### §5.3 Forward roadmap (post-MB-T12)
Inventory at `/mnt/user-data/outputs/wireframe-tickets-inventory.md` (operator-side). 21 tickets across 3 families:
- **Family A — Tile chrome** (MB-T15 header, T16 picker, T17 autopilot toggle, T18 footer, T19 hero+squad)
- **Family B — Conductor chat panel** (MB-T20 shell, T21 Chat tab, T22 Commits tab, T23 Tasks tab, T24-T27 toggles + meters)
- **Family C — BUILD.md integration** (MB-T28 parser, T29 classifier, T30 dispatch loop, T31-T33 speculative + reload + profiles)
- **Hard prerequisites for Family C reasoning loop** — MB-T34 (Anthropic API client), MB-T35 (reasoning loop)

## §6 — Reference docs

For deeper context, consult:
- `docs/build-docs/CONDUCTOR_V3_RESCOPE.md` — current rescope, ticket specs
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — frozen API contract (§10.5 has self-check Q1-Q9)
- `docs/build-docs/WORKSTATION_CONTRACT.md` — workstation IPC + endpoints
- `docs/build-docs/00_BUILD_INDEX.md` — Registry binary build sequencing
- `docs/build-docs/REGISTRY.md` — 16-binary Registry architecture
- `docs/coordination/` — per-session findings + decision docs
- `docs/FOLLOWUPS.md` — open findings + resolved closures

## §7 — Communication style

- Confidence labels on every factual claim (KNOWN/MODELED/SPECULATIVE)
- Concise prose; tables when comparing 3+ things across 3+ dimensions
- Surface findings honestly; don't optimize for "looks-clean" output
- Push back substantively when operator's reasoning has gaps
- "Best judgment" means take the call with conviction, not bounce back
- Strict-mode cairn applies to every response, including responses about the methodology itself

## §8 — What CC should always do

- Read this file at session start
- Verify state via `git status --short` and `git --no-pager log --oneline -5` before action
- Use per-path `git add` always; never `-A` in any context
- Push after every cairn-grammar commit; verify via empty `git log origin/main..HEAD`
- Honor HALT gates encoded in operator prompts
- Surface findings as soon as observed; don't accumulate into a single late surface
- Read source before claiming behavior (anti-fabrication)
- Triangulate around flaky single commands via independent verification
- Distinguish operator-arbitrated work from CC-delegable work; surface the distinction rather than collapse it

## §9 — What CC should never do

- Modify frozen contracts without operator arbitration
- Use `git add -A` or `git add .` (per-path always)
- Chain operator-arbitrated actions behind verification commands (e.g., `typecheck && push`)
- Re-diagnose known pre-existing failures per WB
- Do "preparatory absorption" or "useful prep" during a halt state
- Run the full workstation test suite per WB (scope to WB-relevant directories)
- Create `src/renderer/` or other nested category directories in dispatch-workstation
- Install electron-store unless explicitly authorized
- Claim mechanism correctness without trace-citation evidence
- Force "Improved" outcome framing where evidence is mixed
- Absorb scope creep silently — file as followup
