# MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β — Build-freshness gate + bundle-inclusion verification

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline (workspace methodology surface — NOT frozen contract per CLAUDE.md §3.4 framing; operator-review at HALT-TICKET-BODY-PRE-COMMIT secures authority)
**Authoring delegate:** T6 sub-session under full-build-mode Round 9 parallel dispatch
**Authoring anchor commit (HEAD at authoring time):** `8eab991`
**Workstream:** T6 (methodology runtime-verification) per `docs/coordination/full-build-mode-dispatch.md` §2 + §3.4 parallel-infra clause
**Closes (partial):** `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure paths α + β. Closure path γ (headless screenshot pipeline) DEFERRED to separate ticket cycle per dispatch §3.4 + §6 closure path (γ) wording.
**Cross-closes (Tier 1):** `MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS` (`11f6f29`) closure paths α (rebuild+relaunch as ticket-completion gate) and γ (runtime-staleness check as standing primitive) — see §5.1 for path mapping.
**Depends on (all merged):** existing `scripts/build-*.mjs` renderer-surface esbuild scripts; existing `package.json` `build` script chain; existing Q1-Q9 self-check methodology; existing scope-expansion §C auto-ack envelope per `docs/coordination/orchestrator-state-current.md` §8 (and predecessor `MB-F-ORCHESTRATOR-SCOPE-EXPANSION-2026-05-11` archive `bb36f26`).
**Downstream gates:** all future workstation-touching tickets (T1-T5, T7) inherit α+β gates via auto-ack §C amendment; γ (headless screenshot) parallel-trackable but path-disjoint.
**Path-disjoint from:** T1 (`src/frame-c/` + `src/tile-grid/`), T2 (`src/frame-c/detail-pane.tsx` + PTY stream), T3 (action-bar + kill IPC contract amendment), T4 (bottom rail), T5 (BUILD.md), T7 (visual polish). T6 ships methodology infra only; does NOT compete for source-code surfaces.
**Estimated WB count:** 6 (4 probe-impl pairs + 1 envelope-amendment + 1 docs/findings)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to understand the workspace-methodology framing vs frozen-contract distinction.
2. Read §3 (GATE sub-arbitrations) — three operator decisions are pre-execution prerequisites and shape WB2/WB4/WB5 implementation.
3. Read §4 (WB ladder) for execution order. WBs follow probe-impl pattern: build-freshness probe → freshness implementation → fingerprint probe → fingerprint implementation → envelope amendment → findings docs.
4. §5-§8 are operational supports — cross-references, self-check, definition-of-done, risk register.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per `docs/coordination/full-build-mode-dispatch.md` §2 T6 + §3.4 + `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure paths (α) + (β):

1. **(α) Build-freshness gate** — adds a workspace-methodology primitive that compares `dist/<bundle>/<entry>.js` mtime against HEAD commit timestamp before any `green:` or `green:wiring` auto-ack lands. When `dist/main/main.js` mtime < HEAD commit time (`git log -1 --format=%at`), the gate is STALE. STALE state triggers autonomous `pnpm --filter <pkg> build` invocation by the sub-session per §C auto-ack envelope amendment (§2.4). After rebuild: re-verify mtime ≥ HEAD timestamp; only then auto-ack proceeds.

2. **(β) Bundle-inclusion verification** — adds a workspace-methodology primitive that greps the freshly-built `dist/` artifacts for fingerprint strings declared by the current ticket (e.g., new component `data-testid` value, new factory function name, new IPC channel name). Each fingerprint MUST appear ≥1 time in the relevant dist artifact (renderer fingerprints in the corresponding `dist/<surface>/renderer.js`; main-process fingerprints in `dist/main/main.js` or its sibling modules). Any fingerprint with count=0 triggers `HALT-PRE-COMMIT-MISSING-MODULE`. Pattern is the orchestrator's 2026-05-11T16:49 empirical test (grep for `frame-c-root`, `mountFrameC`, `workstation:read-swarm-state` against `dist/main/main.js` + `dist/tile-grid/renderer.js` — ALL passed, verifying esbuild auto-discovery works for the tile-grid → frame-c sub-mount path).

3. **Implementation surface (likely)** — Sub-Q-MBTMRVCAB-A operator-arbitrated; default surface is per-package script(s) in `packages/dispatch-workstation/scripts/methodology-runtime-verify.mjs` (or split into `scripts/verify-build-freshness.mjs` + `scripts/verify-bundle-fingerprint.mjs`) exposing CLI commands `verify:build-freshness` + `verify:bundle-fingerprint <fingerprint>...`. Workspace-level orchestrator script `scripts/methodology-runtime-verify.mjs` at repo root MAY exist as a wrapper depending on (A) resolution.

4. **Auto-ack §C envelope amendment** — append two new conditions to the `auto_ack_scope` table in `docs/coordination/orchestrator-state-current.md` §8 (workspace methodology surface — operator-supervised mechanical translation per CLAUDE.md §3.4; operator-reviewed at HALT-WB5-PRE-COMMIT):
   - Condition C-α: GREEN impl commits auto-ack ONLY when build-freshness gate passes (dist mtime ≥ HEAD timestamp post-rebuild).
   - Condition C-β: GREEN impl commits auto-ack ONLY when bundle-inclusion verification passes (all declared fingerprints present in dist).
   - New `hard_escalation_triggers` row: `HALT-PRE-COMMIT-MISSING-MODULE` when β fails after rebuild — implies build-pipeline integration gap (e.g., new renderer surface accidentally tsconfig-excluded; esbuild entry-point missing from chain); requires operator arbitration to diagnose.

5. **Reference test (build-freshness gate behavior)** — at WB2 GREEN, add a probe that constructs a synthetic state (touch dist/main/main.js back to T-3600s; HEAD commit-time at T+0) and asserts the gate returns STALE; then trigger rebuild path and assert gate returns FRESH. This is methodology-level test coverage — not a Q1-Q9-style probe of production code, but a probe of the methodology infrastructure itself (acceptable per §3.4 mechanical-translation framing).

6. **Fingerprint declaration convention** — ticket bodies authored post-this-ticket SHOULD declare their fingerprint set in a new ticket-body section §F-Fingerprints (or inline at first WB). Sub-Q-MBTMRVCAB-C operator-arbitrated; default is sub-session identifies fingerprints per WB from the GREEN scope (new component testids, factory names, IPC channels).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints per dispatch §2 T6 + §3.4:

- Does NOT implement closure path γ (headless electron + screenshot pipeline). γ requires new dev-dependency (playwright-electron OR electron-mocha), separate-ticket-arbitration territory. **Tier 2 followup pointer** filed at WB6 docs: `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` — discoverability anchor + closure-path-γ wording from `230cb6c`.
- Does NOT implement closure paths δ (DOM-based runtime probes) or ε (visual diff against `wireframes.jsx`) from `230cb6c`. Both are Tier 2 per `230cb6c`; separate-ticket scoping deferred.
- Does NOT modify CLAUDE.md §4.6 ("Runtime-launch smoke") — current §4.6 remains the per-merge runtime-launch smoke gate; α + β operate at every `green:wiring` commit (pre-merge, per WB) and complement §4.6 rather than replace it.
- Does NOT modify any frozen contracts:
  - `REGISTRY.md §2` (binary contracts)
  - `docs/build-docs/CONDUCTOR_API_CONTRACT.md` (Conductor API v2/v3)
  - `packages/dispatch-core/src/v3/schema.ts` §1-§13 (Zod schema spine)
  - `WORKSTATION_CONTRACT.md` §6 (IPC + endpoints)
- Does NOT modify the cairn five-verb grammar (`red:`/`green:`/`spike:`/`contract:`/`refactor:` per CLAUDE.md §2.3) — α + β operate inside the existing verb structure, not alongside it.
- Does NOT modify Q1-Q9 self-check questions (per CONDUCTOR_API_CONTRACT.md §10.5) — α + β are mechanical pre-commit verifications, not new Q-level discipline.
- Does NOT replace `git status --short` per-commit territory check (CLAUDE.md §8) — α + β are dist-level verifications, not source-tree-level.
- Does NOT implement screenshot generation, image diffing, or any image-format handling.
- Does NOT install electron-store or any new dev-dependency beyond node-builtin `fs`/`child_process`/`path` modules (esbuild + node + pnpm already present).
- Does NOT modify the `T4-successor commit-plan-doc-1334` Wave B WB11 runtime-launch smoke pattern at `docs/coordination/mb-t-wireframe-c1p2-frame-c-surface-runtime-smoke-2026-05-11.md` — that pattern remains the per-ticket smoke gate; α + β are per-WB gates that operate strictly upstream of smoke.

---

## §2 — Arbitration anchor (operator-supervised mechanical translation envelope)

### §2.1 — Workspace-methodology framing (NOT frozen contract)

`[KNOWN per CLAUDE.md §3.4 framing]`

The auto-ack §C envelope lives at `docs/coordination/orchestrator-state-current.md` §8 — a workspace methodology surface, NOT a frozen contract. Frozen contracts are enumerated at CLAUDE.md §1 (REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, schema.ts §1-§13, WORKSTATION_CONTRACT.md §6). The §C envelope is operator-authored workspace methodology; modifications fall under CLAUDE.md §3.4 "operator-supervised mechanical translation" — CC-delegable under tight scope, operator-reviewed before commit.

This ticket's amendment of §C is therefore authored by sub-session under §3.4 envelope; the HALT-WB5-PRE-COMMIT gate secures operator authority over exact wording before commit.

### §2.2 — Closure-path source-of-truth

`[KNOWN per MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP row at 230cb6c]`

Operator-PROPOSED EXECUTION from the `230cb6c` row body:

> post-Wave-C-#5-WB7-docs-landing (T2-successor's current in-flight work), dispatch T2-successor with NEW ticket `MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β` bundling closure paths (α) build-freshness gate + (β) bundle-inclusion verification (shared infrastructure: build script invocation + grep harness; estimated 6-10 WBs). Closure-path (γ) headless electron screenshot pipeline DEFERRED to separate ticket cycle.

This ticket honors the operator-PROPOSED bundling exactly: α + β shipped together as ONE ticket; γ deferred.

### §2.3 — Empirical pattern source-of-truth

`[KNOWN per direct observation 2026-05-11T16:49 + this session 2026-05-12 verification]`

Orchestrator's ad-hoc empirical test pattern from gen-3 session at 2026-05-11T16:49:
- Rebuild: `pnpm --filter dispatch-workstation build`
- Verify fingerprints present in dist:
  - `grep -c "frame-c-root" packages/dispatch-workstation/dist/tile-grid/renderer.js` → 6 hits `[KNOWN this-session]`
  - `grep -c "mountFrameC" packages/dispatch-workstation/dist/tile-grid/renderer.js` → ≥1 hit
  - `grep -c "workstation:read-swarm-state" packages/dispatch-workstation/dist/main/main.js` → 4 hits `[KNOWN this-session]`

This-session verification: HEAD `8eab991` at `2026-05-11T22:05:06-0600`; `dist/main/main.js` mtime `2026-05-11T16:49:27`; mtime < HEAD → gate would correctly classify as STALE `[KNOWN this-session]`. The pattern is the canonical reference implementation for β.

### §2.4 — Scope-expansion §C auto-ack envelope amendment (proposed wording)

`[MODELED — exact wording subject to HALT-WB5-PRE-COMMIT operator review]`

Proposed additions to `docs/coordination/orchestrator-state-current.md` §8 `auto_ack_scope` table:

| category | auto_ack? | rationale |
|---|---|---|
| (existing rows preserved) | (unchanged) | (unchanged) |
| GREEN impl with build-freshness gate PASS (dist mtime ≥ HEAD timestamp after rebuild) | YES | runtime-reach verified pre-commit |
| GREEN impl with bundle-inclusion verification PASS (all declared fingerprints present in dist) | YES | esbuild integration gap caught pre-merge |

Proposed addition to `hard_escalation_triggers`:

> 10. `HALT-PRE-COMMIT-MISSING-MODULE`: bundle-inclusion verification (β) returns count=0 for ≥1 declared fingerprint after fresh build. Implies build-pipeline integration gap (e.g., new renderer surface accidentally tsconfig-excluded; esbuild entry-point missing from `package.json` build chain; transitive bundling assumption violated). Operator arbitration required to diagnose root cause before proceeding.

Combined with closure-path-γ language already in dispatch §3.5 (visual-comparison gate addition), the §C envelope evolves toward runtime-verification primitives at every layer (build mtime → bundle inclusion → headless screenshot).

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

Three operator decisions remain pre-execution prerequisites. Surface at HALT-TICKET-BODY-PRE-COMMIT for operator resolution before WB2 (Sub-Q-A surface location), WB4 (Sub-Q-B auto-invocation mechanism), and WB6 (Sub-Q-C fingerprint enumeration responsibility).

### §3.1 — Sub-Q-MBTMRVCAB-A: Methodology surface location

Required before **WB2** (build-freshness gate implementation). Default if unresolved: **(ii) per-package package.json scripts**.

| Option | Mechanism | Discoverability | Reuse across packages |
|---|---|---|---|
| (i) Shared workspace script | NEW `scripts/methodology-runtime-verify.mjs` at repo root. Single source-of-truth; invoked via `node scripts/methodology-runtime-verify.mjs <pkg-name> <fingerprints>` from any sub-session. | HIGH — one path to remember | HIGH — works for all 5 packages identically |
| (ii) Per-package package.json scripts | NEW `verify:build-freshness` + `verify:bundle-fingerprint` scripts in each `packages/<pkg>/package.json`. Invoked as `pnpm --filter <pkg> verify:build-freshness`. Implementation lives in each package's `scripts/` dir OR symlinks to shared lib. | MEDIUM — matches existing `build`/`typecheck`/`test` pattern; sub-sessions already know `pnpm --filter <pkg> <cmd>` shape | MEDIUM — per-package implementation OR shared lib referenced from each package |
| (iii) CLAUDE.md hook documentation | NEW `CLAUDE.md §4.7` describes the manual ritual: sub-session runs `git log -1 --format=%at`, `stat -f %m dist/<bundle>/<entry>.js`, `grep -c <fingerprint> <dist-path>`, compares. NO new script — methodology-as-documentation. | LOW — manual ritual easy to skip under pressure | N/A — documented procedure, not code |

`[MODELED]` Recommend **(ii)** per-package package.json scripts. Rationale: matches existing `pnpm --filter <pkg> build` pattern operator and sub-sessions already invoke; integrates naturally into auto-ack §C envelope wording (`pnpm --filter <pkg> verify:build-freshness && pnpm --filter <pkg> verify:bundle-fingerprint ...`); easier for sub-sessions to discover via `package.json scripts` inspection than a workspace-root script.

Implementation under (ii): a small shared helper at `packages/dispatch-workstation/scripts/methodology-runtime-verify.mjs` (initial location since this is the only workstation-touching workstream; future workstreams can mirror to `packages/dispatch-core/scripts/` etc. as needed).

Operator decision pending.

### §3.2 — Sub-Q-MBTMRVCAB-B: Build-script auto-invocation mechanism

Required before **WB4** (envelope-integration: how sub-sessions actually trigger the rebuild). Default if unresolved: **(i) sub-session-side bash command per §C amendment**.

| Option | Mechanism | Discipline cost | Race-condition surface |
|---|---|---|---|
| (i) Sub-session-side bash | Sub-session reads §C envelope; when about to auto-ack a `green:wiring` commit, runs `pnpm --filter <pkg> verify:build-freshness`; on STALE response, runs `pnpm --filter <pkg> build`; re-verifies; only then commits. Explicit; visible in tool-invocation chain. | MEDIUM — sub-session must remember invocation; methodology incident if skipped | LOW — sequential within sub-session turn |
| (ii) Git pre-commit hook | NEW `.husky/pre-commit` (or `git config core.hooksPath`) hook runs `verify:build-freshness` + `verify:bundle-fingerprint`; commit aborts on FAIL. Automatic; cannot be skipped without `--no-verify` (forbidden per CLAUDE.md §9). | LOW — automatic | MEDIUM — multiple sub-sessions in parallel-cairn worktrees may race; hook runs per-session-worktree but dist is per-package |
| (iii) CI-only | GitHub Actions (if added) runs verifications post-push; PR-style gates. NO local enforcement; sub-sessions can land bad commits to local branches; only origin/main gated. | HIGH — defeats per-commit-push discipline per CLAUDE.md §2.6 (push happens before CI catches) | N/A locally; HIGH at origin |

`[MODELED]` Recommend **(i)** sub-session-side bash. Rationale: matches existing methodology where sub-sessions run `pnpm --filter <pkg> typecheck` explicitly per WB (per CLAUDE.md §4.4); auto-ack envelope §C already encodes sub-session-side discipline; (ii) git-hook is parallel-cairn-fragile per `MB-F-WORKTREE-SAMEPATH-CROSSSESSION-SWEEP` precedent; (iii) CI-only defeats per-commit-push.

(ii) git pre-commit hook may be a future-cycle complement; filed as Tier 3 followup at WB6 if (i) selected.

Operator decision pending.

### §3.3 — Sub-Q-MBTMRVCAB-C: Fingerprint enumeration responsibility

Required before **WB6** (docs/findings convention). Default if unresolved: **(i) sub-session identifies fingerprints per WB**.

| Option | Mechanism | Authoring overhead | Maintenance |
|---|---|---|---|
| (i) Sub-session identifies per WB | Sub-session GREEN-impl WB declares fingerprints in commit body §Q1-Q9 sibling section §F-Fingerprints (e.g., `data-testid="frame-c-root"`, `mountFrameC`, `workstation:read-swarm-state`). Verify script accepts fingerprints as CLI args. | LOW — sub-session already has the GREEN scope in context | LOW — fingerprints live in commit body history |
| (ii) Automated extraction from new test files | NEW probe-parser extracts fingerprints from `data-testid="..."` strings in new test files; verify script auto-discovers. Eliminates declaration step. | NONE — automated | MEDIUM — parser must handle both .spec.ts and .test.ts; depends on test-authoring discipline |
| (iii) Operator-provides | Operator includes fingerprint list in ticket body §F-Fingerprints at ticket-body-authoring time; sub-session reads from ticket body each WB. | MEDIUM — operator pre-arbitrates fingerprints | LOW — fingerprints live in ticket body |

`[MODELED]` Recommend **(i)** sub-session identifies per WB. Rationale: sub-session has GREEN scope in context at impl time; matches existing Q1-Q9 self-check authoring discipline; (ii) automated extraction is brittle (different testid quoting styles; non-testid fingerprints like factory names + IPC channels); (iii) operator-provides is high-overhead and adds a serialization point.

(ii) automated extraction may be a future-cycle enhancement; filed as Tier 3 followup if (i) selected and shows sustained authoring overhead.

Operator decision pending.

---

## §4 — WB ladder

6 WBs baseline (defaults Sub-Q-A=(ii) + Sub-Q-B=(i) + Sub-Q-C=(i)); 7-8 WBs if alternates selected (e.g., Sub-Q-A=(i) adds workspace-root-script WB; Sub-Q-B=(ii) adds husky-config WB).

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per CLAUDE.md §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β): probe-MBTMRVCAB-01-build-freshness-gate`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/methodology-runtime-verify/probe-mbtmrvcab-01-build-freshness-gate.spec.ts` (NEW dir). Asserts:
- Synthetic state setup: `dist/main/main.js` mtime touched to T-3600s (1 hour pre-HEAD); HEAD commit timestamp at T+0 via `git log -1 --format=%at` mock.
- Invoke `verifyBuildFreshness({pkg: 'dispatch-workstation', distPath: 'dist/main/main.js'})` from `scripts/methodology-runtime-verify.mjs` (NEW; does not yet exist).
- Assert returns `{state: 'STALE', distMtimeS: T-3600, headCommitTimeS: T}` with `distMtimeS < headCommitTimeS`.

Probe fails RED — `methodology-runtime-verify.mjs` does not yet exist (import-resolve failure).

**Acceptance:** probe RED on import-resolve failure. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.

### WB2 — `green(MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β): build-freshness gate (α) implementation`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/scripts/methodology-runtime-verify.mjs` (per Sub-Q-A=(ii) default; OR repo-root + per-package package.json scripts per Sub-Q-A=(i)):

```javascript
// Exports verifyBuildFreshness({pkg, distPath}): {state: 'FRESH'|'STALE', distMtimeS, headCommitTimeS}
// Reads dist file mtime via fs.statSync; reads HEAD commit timestamp via `git log -1 --format=%at`.
// STALE when distMtimeS < headCommitTimeS.
```

Plus `package.json` script: `"verify:build-freshness": "node scripts/methodology-runtime-verify.mjs verify-build-freshness"` (per Sub-Q-A=(ii)).

CLI invocation shape: `pnpm --filter dispatch-workstation verify:build-freshness --dist-path dist/main/main.js`.

Exit codes: 0 = FRESH; 1 = STALE; 2 = ERROR (missing dist file → implies build never ran).

**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none — new script, new package.json scripts entry.
**Sub-Q-A blocker:** WB2 surface location determined per Sub-Q-A; surface at HALT-WB2-PRE-COMMIT if (i) workspace-root path chosen instead of (ii) per-package.

### WB3 — `red(MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β): probe-MBTMRVCAB-02-bundle-fingerprint`

**Type:** red
**Scope:** RED probe at `probe-mbtmrvcab-02-bundle-fingerprint.spec.ts`. Asserts:
- Synthetic fixture: temp dir with `dist/main/main.js` containing string `"hello-world-fingerprint"`; HEAD ahead of dist mtime irrelevant for this probe (β operates post-rebuild assumption).
- Invoke `verifyBundleFingerprint({distPath, fingerprints})` from `scripts/methodology-runtime-verify.mjs`:
  - Case A: `fingerprints: ['hello-world-fingerprint']` → returns `{state: 'PASS', results: [{fingerprint: 'hello-world-fingerprint', count: 1}]}`.
  - Case B: `fingerprints: ['missing-string']` → returns `{state: 'FAIL', results: [{fingerprint: 'missing-string', count: 0}]}`.
  - Case C: `fingerprints: ['hello-world-fingerprint', 'missing-string']` → returns `{state: 'FAIL', ...}` (any count=0 → FAIL).

Probe fails RED — `verifyBundleFingerprint` not yet exported.

**Acceptance:** probe RED. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB4 — `green(MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β): bundle-inclusion verification (β) implementation`

**Type:** green
**Scope:** GREEN extension of `packages/dispatch-workstation/scripts/methodology-runtime-verify.mjs`:

```javascript
// Exports verifyBundleFingerprint({distPath, fingerprints: string[]}):
//   {state: 'PASS'|'FAIL', results: [{fingerprint: string, count: number}]}
// Reads distPath contents via fs.readFileSync; counts substring occurrences per fingerprint via String.matchAll or split.
// PASS when ALL fingerprints have count ≥ 1; FAIL otherwise.
```

Plus `package.json` script: `"verify:bundle-fingerprint": "node scripts/methodology-runtime-verify.mjs verify-bundle-fingerprint"`.

CLI invocation shape: `pnpm --filter dispatch-workstation verify:bundle-fingerprint --dist-path dist/main/main.js --fingerprint "frame-c-root" --fingerprint "mountFrameC"`.

Exit codes: 0 = PASS; 1 = FAIL with per-fingerprint count breakdown on stderr; 2 = ERROR (missing dist file).

**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.
**Empirical anchor:** at WB4 close, run the orchestrator's canonical fingerprint set against current dist to verify the pattern holds:
- `pnpm --filter dispatch-workstation verify:bundle-fingerprint --dist-path dist/tile-grid/renderer.js --fingerprint "frame-c-root" --fingerprint "mountFrameC"` → expect PASS.
- `pnpm --filter dispatch-workstation verify:bundle-fingerprint --dist-path dist/main/main.js --fingerprint "workstation:read-swarm-state"` → expect PASS.
- Capture output in commit body.

### WB5 — `green(MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β): auto-ack §C envelope amendment`

**Type:** green (workspace-methodology surface amendment per CLAUDE.md §3.4)
**Scope:**
- Append two rows to `auto_ack_scope` table in `docs/coordination/orchestrator-state-current.md` §8 per §2.4 wording.
- Append `HALT-PRE-COMMIT-MISSING-MODULE` entry to `hard_escalation_triggers` per §2.4 wording.
- Optionally append §C-α + §C-β workflow note as a new sub-section (e.g., §8.α + §8.β) describing the verify-script invocation chain sub-sessions should follow on every `green:wiring` commit.

**Acceptance:** §C amendment lands; existing rows preserved verbatim. Commit body Q1-Q9. **HALT-WB5-PRE-COMMIT SURFACE for operator review of exact wording** — operator authority over methodology surface preserved per CLAUDE.md §3.4 mechanical-translation framing.

**Frozen contracts touched:** none — `orchestrator-state-current.md` is workspace methodology surface, not frozen contract. (Pre-arbitrated by operator per §2.1 framing; HALT secures wording specifically.)

**Sub-Q-B blocker:** envelope wording shape depends on Sub-Q-B resolution — (i) sub-session-side bash invocation lines vs (ii) git-hook description vs (iii) CI-only reference. Default (i) wording shown in §2.4; alternates at HALT-WB5-PRE-COMMIT.

### WB6 — `docs(MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β): findings doc + FOLLOWUPS updates + γ followup filing`

**Type:** docs
**Scope:** author `docs/coordination/mbtmrvcab-findings-2026-05-12.md` per `mbtwbfcs-findings-2026-05-11.md` format anchor: I What Shipped / II Q-disposition / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale / IX New Followups Filed / X Open Items.

Followup updates to `docs/FOLLOWUPS.md`:
- File NEW Tier 2 row: `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` — pointer to deferred closure-path γ from `230cb6c`. Body describes the playwright-electron OR electron-mocha dependency arbitration needed; estimated 8-12 WBs separate-ticket; cross-ref to this ticket as α+β predecessor.
- File NEW Tier 3 row (CONDITIONAL Sub-Q-B=(i)): `MB-F-METHODOLOGY-RUNTIME-VERIFY-PRE-COMMIT-HOOK-CANDIDATE` — pointer to Sub-Q-B=(ii) git-hook alternative; operator may activate post-α+β-stabilization.
- File NEW Tier 3 row (CONDITIONAL Sub-Q-C=(i)): `MB-F-METHODOLOGY-FINGERPRINT-AUTO-EXTRACTION-CANDIDATE` — pointer to Sub-Q-C=(ii) automated extraction alternative.
- Append closure-stamp to `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) row: closure paths α + β closed at this ticket's WB6 commit SHA; γ + δ + ε remain open.
- Append closure-stamp to `MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS` (`11f6f29`) row: closure path α (rebuild+relaunch ticket-completion gate) closed via this ticket's §C amendment (rebuild is now per-WB, not per-merge); closure path γ (runtime-staleness check as standing primitive) closed via verify-build-freshness CLI primitive.

Cross-reference at WB6:
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (`64d9249`) — sibling Tier 1; α+β reduce-but-do-not-close (visual verification still requires γ).
- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (in `docs/FOLLOWUPS.md` per dispatch §6 filing) — closure path (γ) "visual-comparison gate" depends on this ticket's α+β as predecessor.
- `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` — sibling Tier 2; α primitive is reusable for dispatch-core post-pull rebuild check; cross-ref noted.

**Acceptance:** findings doc + FOLLOWUPS updates + closure stamps land. Commit body Q1-Q9.
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup / Row | Tier | Closure path (in target row) | Closing WB |
|---|---|---|---|
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) | Tier 1 | (α) build-freshness gate + (β) bundle-inclusion verification | WB2 (α) + WB4 (β) + WB5 (envelope) |
| `MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS` (`11f6f29`) | Tier 1 | (α) rebuild+relaunch ticket-completion gate (via §C per-WB amendment) + (γ) runtime-staleness check as standing primitive (via verify-build-freshness CLI) | WB5 (envelope) + WB6 (closure stamp) |
| (β/γ closure paths in `11f6f29`) | (annotation) | (β) investigate build-tile-grid.mjs auto-discovery — verified PASS empirically 2026-05-11T16:49 + this-session 2026-05-12; closure stamp at WB6 | WB6 |

**Partial closures (do NOT close):**
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure path (γ) headless screenshot — DEFERRED per dispatch §3.4; tracked at new Tier 2 row filed WB6.
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure paths (δ) DOM-based runtime probes + (ε) visual diff against wireframes.jsx — separate-ticket scoping deferred; remain open.
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (`64d9249`) — α+β reduce visibility gap but do not close; visual verification still requires γ.

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 may discover that `git log -1 --format=%at` returns UTC seconds vs `fs.statSync().mtimeMs / 1000` returns local-tz-shifted seconds — timezone bug class. Mitigation: explicit UTC normalization in helper; file Tier 3 followup if discovery is non-obvious.
- WB4 may discover that grep-via-substring-count is brittle for minified bundles or chunks with hashed filenames (`dist/<surface>/renderer-<hash>.js`). esbuild output paths use deterministic `renderer.js` per current scripts; mitigation deferred unless surfaced.
- WB4 may surface that some fingerprints are split across multiple chunks (e.g., shared chunks across surfaces). Mitigation: glob-search across `dist/<surface>/**/*.js` not just single-file; flag at HALT-WB4-PRE-COMMIT if observed.
- WB5 may surface that `orchestrator-state-current.md` §8 table format does not cleanly accept new rows due to markdown rendering ambiguity — minor; mitigation is pure-text edit verified by re-reading file post-edit.
- WB6 closure-stamp on `230cb6c` may discover the row body text length budget tight; mitigation: append closure stamp as a sub-bullet rather than re-flowing body.
- WB6 may discover the `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` (sibling Tier 2 per `230cb6c` Discoverability section) row needs cross-ref update — file as in-ticket-cycle update.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| `MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE` (T4-successor commit-plan-doc-1334) | `8eab991` (WB11 docs HEAD) | WB10 mount-wiring sentinel zone (proves α gate would have caught this had it existed pre-WB10); empirical fingerprint set (`frame-c-root`, `mountFrameC`) — canonical β test cases. |
| Build pipeline (current 9-script chain) | `packages/dispatch-workstation/package.json:12` | The `build` script chain — α primitive triggers this on STALE. |
| `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` (sibling Tier 2 per FOLLOWUPS) | `185057a` | Sibling case: dispatch-core dist staleness after merge to main; α primitive reusable here. |

### §5.4 — Plan-doc anchors (read at WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` §2 T6 (workstream definition)
- §3.4 (methodology infrastructure parallel execution rationale)
- §3.5 (visual-comparison gate addition to auto-ack §C — closure-path-γ wording reference for the parallel ticket)
- §6 (Tier 1 filing wording template — informs closure-stamp wording at WB6)

### §5.5 — Methodology-doc anchors (read at WB1 start)

- `CLAUDE.md §2.1` (anti-fabrication: runtime-verification primitives) — the source-of-discipline that α + β operationalize.
- `CLAUDE.md §3.4` (dispatch-core dist build discipline — current weakest-in-repo runtime-reach assumption) — α primitive eliminates the manual `pnpm --filter dispatch-core build` step's invisibility.
- `CLAUDE.md §4.4` (verification ordering multi-package) — α + β integrate at step 1 (dispatch-core build) before step 2 (probes).
- `CLAUDE.md §4.6` (runtime-launch smoke as merge gate) — α + β are pre-merge per-WB gates; §4.6 remains the post-merge gate.
- `CONDUCTOR_API_CONTRACT.md §10.5` (Q1-Q9 self-check) — α + β do not modify Q1-Q9; they operate alongside.

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — observational RED | BEHAVIOR (real fs.statSync + real git invocation against synthetic fixture) | No — impl absent; probe RED until WB2 | No — probe-only | No | KNOWN/MODELED applied | new test/unit/methodology-runtime-verify/ path-disjoint from T1-T5/T7 territories | N/A | No (HALT auto-ack per op autonomous mode) |
| WB2 GREEN | (see WB1) | BEHAVIOR (real fs + real git command via child_process) | No — impl load-bearing for STALE/FRESH classification | No | No (workspace script, not frozen contract) | KNOWN/MODELED applied | scripts/methodology-runtime-verify.mjs is new path-disjoint file | N/A | No |
| WB3 RED | N/A | BEHAVIOR (real fs.readFileSync + substring count against synthetic dist fixture) | No — impl absent | No — probe-only | No | KNOWN/MODELED applied | new probe path-disjoint | N/A | No |
| WB4 GREEN | (see WB3) | BEHAVIOR (real grep semantics; no mocks) | No — impl load-bearing for PASS/FAIL classification | No | No (workspace script) | KNOWN/MODELED applied | scripts/methodology-runtime-verify.mjs extended; package.json scripts added — both files in workstation territory and disjoint from concurrent T1-T5 work | N/A | No |
| WB5 GREEN | N/A | N/A (workspace-methodology docs amendment) | N/A | No — orchestrator-state-current.md is operator-supervised mechanical-translation territory per §3.4 | No (NOT frozen contract per §2.1) | KNOWN/MODELED applied | docs/coordination/orchestrator-state-current.md — read+write disjoint from concurrent ticket-authoring sub-sessions (those write to docs/build-docs/) | N/A | **HALT-WB5-PRE-COMMIT REQUIRED** — operator wording review before commit per §2.1 mechanical-translation envelope |
| WB6 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md edits | No | KNOWN per direct ticket-execution evidence | docs paths disjoint from production code; FOLLOWUPS.md row appends per existing pattern | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB4 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`scripts/methodology-runtime-verify.mjs` shipped**: exports `verifyBuildFreshness` + `verifyBundleFingerprint`; CLI invocation via `pnpm --filter dispatch-workstation verify:build-freshness` + `verify:bundle-fingerprint`.
3. **α primitive empirically validated**: HEAD `<post-WB4-SHA>` at commit time T; `dist/main/main.js` mtime equals or exceeds T after `pnpm --filter dispatch-workstation build`; verify-build-freshness returns FRESH.
4. **β primitive empirically validated**: `verify-bundle-fingerprint --dist-path dist/tile-grid/renderer.js --fingerprint "frame-c-root"` returns PASS (canonical fingerprint from T4-successor ticket). `--fingerprint "definitely-not-in-bundle-12345"` returns FAIL (negative test).
5. **§C envelope amended**: `orchestrator-state-current.md` §8 `auto_ack_scope` table contains C-α + C-β rows; `hard_escalation_triggers` contains `HALT-PRE-COMMIT-MISSING-MODULE`. Operator-reviewed exact wording per HALT-WB5-PRE-COMMIT.
6. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time). Methodology script is `.mjs` (not type-checked by tsc), but adding `package.json` scripts entries does not affect typecheck.
7. **No regression in pre-existing baseline failures** per CLAUDE.md §4.5: `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` remain at known state; not re-diagnosed per WB.
8. **WB6 findings doc + FOLLOWUPS.md updates** lands; `230cb6c` + `11f6f29` closure stamps applied; γ Tier 2 followup filed.
9. **Methodology-incident-free across WB1-WB6**: no anti-fabrication violations; no halt-unauthorized actions; no `git add -A` invocations; no chain of operator-arbitrated actions behind verification commands.
10. **Subsequent ticket cycles (T1-T5, T7) observe α + β at every `green:wiring` commit**: empirically validated by orchestrator at next-ticket-WB1; if α or β fails at first downstream use, scope-extend (Tier 1 if methodology incident) rather than regress.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `git log -1 --format=%at` returns timestamps in UTC seconds while `fs.statSync().mtimeMs / 1000` is local-tz-influenced — α primitive returns false STALE on system tz != UTC | `[MODELED-MEDIUM]` (depends on Node's `fs.statSync` semantics — node docs say ms since UNIX epoch, which is UTC-anchored; safe but worth probe) | `[MODELED-LOW]` (false STALE causes unnecessary rebuilds, not silent failures) | WB1 probe explicitly compares both values via Date constructor; WB2 helper uses UTC consistently; tz-edge-case Tier 3 followup if observed |
| Sub-Q-A=(i) workspace-root path adds a new top-level repo directory; may confuse package-local scripts convention | `[MODELED-LOW]` | `[MODELED-LOW]` (single new path; documented at CLAUDE.md if material) | Default to (ii) per-package package.json scripts; Sub-Q-A operator-arbitrated at HALT-TICKET-BODY-PRE-COMMIT |
| Sub-Q-B=(ii) git pre-commit hook triggers across all parallel-cairn worktrees — may race or double-rebuild | `[MODELED-MEDIUM]` if (ii) chosen | `[MODELED-MEDIUM]` (sub-session cycle time impact + worktree-dist coupling unclear) | Default to (i) sub-session-side bash; Sub-Q-B operator-arbitrated; (ii) deferred as Tier 3 candidate |
| Sub-Q-C=(ii) automated fingerprint extraction misses non-testid fingerprints (factory names, IPC channels) | `[MODELED-HIGH]` if (ii) chosen | `[MODELED-MEDIUM]` (β passes false-positive when factory missing but testid present) | Default to (i) sub-session declares per WB; Sub-Q-C operator-arbitrated; (ii) deferred as Tier 3 |
| β primitive's substring count is brittle for minified bundles (collisions, mangled names) — false POSITIVE if fingerprint string accidentally appears in minified noise | `[MODELED-LOW]` (current esbuild config has `minify: false` per `build-tile-grid.mjs:33`; future minification would invalidate β) | `[MODELED-MEDIUM]` (silent miss if minified) | WB6 docs note: `minify: false` is load-bearing for β; file Tier 3 followup `MB-F-METHODOLOGY-β-MINIFY-COUPLING` if minification is ever enabled |
| HALT-WB5-PRE-COMMIT operator wording-review delay blocks WB6 docs | `[MODELED-LOW]` (operator async-available per dispatch §5.3) | `[MODELED-LOW]` (queue-and-wait acceptable) | Sub-session surfaces HALT-WB5; pauses; respects §2.5 halt discipline — no preparatory absorption |
| `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` pre-existing failure (CLAUDE.md §4.5) re-surfaces as misattributed-to-this-ticket | `[KNOWN-PRE-EXISTING]` | `[MODELED-LOW]` (cosmetic noise) | Sub-session notes "pre-existing per §4.5" at every typecheck/test surface; does NOT re-diagnose |
| Empirical β validation at WB4 fails because current dist artifacts predate frame-c source code (i.e., orchestrator's 16:49 rebuild needs re-run before WB4 close) | `[KNOWN this-session]` (mtime `16:49:27` vs HEAD `22:05:06`) | `[MODELED-LOW]` (WB4 close requires fresh rebuild; trivial) | WB4 GREEN step 1 is `pnpm --filter dispatch-workstation build`; verify HEAD-vs-dist FRESH; then run β empirical tests |
| Future-ticket fingerprint declarations forgotten (Sub-Q-C=(i) discipline failure) — β silently passes vacuously when no fingerprints declared | `[MODELED-MEDIUM]` (human-in-loop sub-session discipline) | `[MODELED-MEDIUM]` (β rendered no-op for that ticket) | WB6 §F-Fingerprints convention authored; auto-ack §C envelope wording at WB5 requires at-least-one-fingerprint per `green:wiring` commit; methodology-incident-class if violated |
| γ (deferred) — visual diff still requires operator screenshot; α+β do NOT close the operator-visual-load problem fully | `[KNOWN]` | `[MODELED-HIGH]` (operator load remains until γ ships) | Explicitly out-of-scope; Tier 2 followup `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` filed at WB6; arbitrated separately |

---

**End of MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β ticket body.**

Pending operator resolutions before execution:
- Sub-Q-MBTMRVCAB-A (§3.1) — methodology surface location (i workspace script / ii per-package scripts (RECOMMENDED) / iii CLAUDE.md hook docs)
- Sub-Q-MBTMRVCAB-B (§3.2) — build-script auto-invocation mechanism (i sub-session-side bash (RECOMMENDED) / ii git pre-commit hook / iii CI-only)
- Sub-Q-MBTMRVCAB-C (§3.3) — fingerprint enumeration responsibility (i sub-session per WB (RECOMMENDED) / ii automated extraction / iii operator-provides)

Plus mandatory **HALT-WB5-PRE-COMMIT** operator wording-review of the §C envelope amendment text per CLAUDE.md §3.4 mechanical-translation framing.
