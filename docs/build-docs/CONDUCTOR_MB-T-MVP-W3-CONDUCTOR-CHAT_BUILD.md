# CONDUCTOR MB-T-MVP-W3-CONDUCTOR-CHAT — Build Doc

**Status**: SHIPPED (Path-B renderer-only; production wiring deferred)
**Closure SHA**: WB-final (this commit)
**Date**: 2026-05-17
**Sessions**: `r12-mvp-w3-conductor-chat` (gen-7-w3) + `operator-CC` (cross-session lane)

## §1 — Ticket scope

Wave-3 of the Conductor V_MVP design per operator vision `23b4362` §"Component 3 — conductor-chat" + arbitration `94d3e17` §5.3 (NEW `src/conductor-chat/` replacing prior chat-shell tab-host) + design bundle `a20d0d4` (`docs/design-handoff/conductor-v-mvp/project/conductor-chat.jsx` + screenshots).

Ships a fresh Claude.ai-style chat surface at `packages/dispatch-workstation/src/conductor-chat/`:
- 3-row structural shell (36px header / scrolling thread / composer)
- 5-variant message renderer (user/assistant/dispatch/system + typing)
- Composer (paperclip + textarea + send + BuildMdChip stub + dispatch-next)
- Header (C-mark + brand + attached-state filename pill + pause/resume + cancel)
- BuildMdChip (svg icon + name + steps + optional remove × button)
- Mount layer (`tryAutoMountConductorChat` + ConductorChatBridge contract)

## §2 — Source surface

```
packages/dispatch-workstation/src/conductor-chat/
├── conductor-chat.tsx          // gen-7-w3 d0a96bf + fa5afbb (slot composition)
├── conductor-message.tsx       // gen-7-w3 a0baa19 (5-variant union + typing variant)
├── composer.tsx                // operator-CC f46649d
├── header.tsx                  // operator-CC 6c0686d
├── build-md-chip.tsx           // gen-7-w3 9357fd8
├── mount.ts                    // gen-7-w3 fa5afbb + bdc50a8 (DEFAULT_IDLE_STATE)
└── index.ts                    // gen-7-w3 fa5afbb (barrel)
```

NOT shipped (deferred per Path-B → `MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED`):
- `packages/dispatch-workstation/src/main/conductor-chat-ipc.ts`
- `packages/dispatch-workstation/scripts/build-conductor-chat.mjs`
- Production main.ts sentinel for IPC handler registration
- Production shell.html `<script>` tag insertion
- tsconfig.json `exclude` amendment adding `src/conductor-chat`

## §3 — Public API

```typescript
// src/conductor-chat/index.ts barrel

// — Components
export { ConductorChat } from './conductor-chat.js';
export { ConductorMessage } from './conductor-message.js';
export { BuildMdChip } from './build-md-chip.js';

// — Component prop types
export type { ConductorChatProps } from './conductor-chat.js';
export type {
  ConductorMessageProps,
  ConductorMessageVariant,
} from './conductor-message.js';
export type { BuildMdChipProps } from './build-md-chip.js';

// — Mount API
export { tryAutoMountConductorChat } from './mount.js';
export type {
  ConductorChatBridge,
  ConductorChatState,
  ConductorChatMountOptions,
  ConductorChatMountResult,
} from './mount.js';
```

### §3.1 — ConductorChatState

```typescript
interface ConductorChatState {
  messages: ReadonlyArray<ConductorMessageVariant>;
  attached: { name: string; steps: number } | null;
  queue: ReadonlyArray<unknown>;
  running: number;
  total: number;
  paused: boolean;
}
```

### §3.2 — ConductorChatBridge (Path-B stub-only IPC)

```typescript
interface ConductorChatBridge {
  getInitialState?(): ConductorChatState;
  onStateChange?(cb: (state: ConductorChatState) => void): () => void;
  send?(text: string): void;
  attach?(): void;
  detach?(): void;
  dispatchNext?(): void;
  togglePause?(): void;
  cancel?(): void;
}
```

All methods optional per Path-B: production wiring deferred to MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED Tier-1 followup. Renderer treats bridge=absent as "empty state, no-op actions" with the default idle intro bubble rendered.

### §3.3 — tryAutoMountConductorChat

```typescript
function tryAutoMountConductorChat(
  opts?: ConductorChatMountOptions,
): ConductorChatMountResult;

// opts.rootElementId — reuse existing root by ID; default = "conductor-chat-mount-root"
// opts.bridge — test injection override; default = window.conductorChatBridge
// opts.renderHeader — render-prop for header slot; default = no content
// (renderComposer is internally wired to operator-CC's Composer)

// Returns:
//   { mounted: true, dispose: () => void }
//   | { mounted: false, reason: 'no-document' }
```

## §4 — FROZEN testid contract

Per `docs/coordination/w3-testid-contract-2026-05-17.md` (operator-arbitrated `9625e04`):

### SHELL (gen-7-w3 d0a96bf)
- `conductor-chat-root` / `-header` / `-thread` / `-composer`

### MESSAGE ROLES (gen-7-w3 a0baa19)
- `conductor-message-user` / `-user-bubble`
- `conductor-message-assistant` / `-assistant-mark` / `-assistant-body`
- `conductor-message-dispatch` / `-rule` / `-badge` / `-step` / `-arrow` / `-target` / `-task`
- `conductor-message-system` / `-system-dot`
- `conductor-message-typing` / `-typing-dot` / `-typing-label`

### COMPOSER (operator-CC f46649d)
- `conductor-composer-paperclip` / `-textarea` / `-send`
- `conductor-composer-buildmd-chip` (stub div in composer.tsx:48-53; real body in build-md-chip.tsx with `-name` / `-meta` / `-x` sub-testids)
- `conductor-composer-dispatch-next`

### HEADER (operator-CC 6c0686d)
- `conductor-header-brand` / `-filename-pill`
- `conductor-header-pause` (when `!paused`) / `-resume` (when `paused`) — mutually exclusive
- `conductor-header-cancel`

## §5 — Test surface (60/60 GREEN at WB-final)

| Probe | Tests | Owner | SHA |
|-------|-------|-------|-----|
| `probe-mbt-mvp-w3-01-conductor-chat-scaffold.spec.tsx` | 7/7 | gen-7-w3 | `d0a96bf` |
| `probe-mbt-mvp-w3-02-conductor-message-role-rendering.spec.tsx` | 7/7 | gen-7-w3 | `a0baa19` |
| `probe-mbt-mvp-w3-03-composer-paperclip-textarea-send.spec.tsx` | 8/8 | operator-CC | `f46649d` |
| `probe-mbt-mvp-w3-04-header-pause-resume-cancel.spec.tsx` | 7/7 | operator-CC | `6c0686d` |
| `probe-mbt-mvp-w3-05-mount-integration-ipc-wiring.spec.tsx` | 8/8 | gen-7-w3 | `fa5afbb` + `bdc50a8` |
| `probe-mbt-mvp-w3-06-screenshot-fidelity-acceptance.spec.tsx` | 7/7 | gen-7-w3 | `bdc50a8` (§5.5 HARD GATE) |
| `probe-mbt-mvp-w3-08-build-md-chip-rendering.spec.tsx` | 8/8 | gen-7-w3 | `9357fd8` |
| `test/integration/probe-mbt-mvp-w3-07-conductor-chat-integration.test.ts` | 8/8 | gen-7-w3 | `28b5692` |

**Combined: 60 tests across 8 suites — 100% pass.**

Verification command:
```bash
pnpm --filter dispatch-workstation exec vitest run \
  test/unit/conductor-chat/ \
  test/integration/probe-mbt-mvp-w3-07-conductor-chat-integration.test.ts
```

## §6 — Design oracle (§5.5 NORMATIVE pixel-perfect HARD GATE)

Per Q-W3-1 = (a) qualitative operator review + Q-W3-2 = (a) idle-only:

| Screenshot | State |
|------------|-------|
| `check.png` | idle (orchestrator pane: 14 total / 3 queued / 4 running) |
| `check2.png` | idle (3 running variant) |
| `progress.png` | idle (pristine — single intro bubble, empty composer) |
| `progress2.png` | idle (6 agents running) |
| `progress3.png` | idle (1 done) |
| `progress4.png` | idle (5 panes 1 done) |

All 6 show the SAME ConductorChat idle state. Attached-state oracle = DEFERRED (`MB-F-W3-WB6-ATTACHED-STATE-SCREENSHOT-COVERAGE-PENDING`).

Probe-06 satisfies the structural / textual / design-token-bleed subset machine-checkable without a pixel-diff rasterizer:
- ✅ Shell anchors present (per WB1 FROZEN contract)
- ✅ Header brand ONLY (`CConductor`); no filename pill / pause / resume / cancel at idle
- ✅ Thread shows canonical assistant intro from design `app.jsx:86` verbatim
- ✅ Composer paperclip + idle textarea placeholder + DISABLED send button
- ✅ No BuildMdChip + no dispatch-next at idle
- ✅ DOM order header → thread → composer
- ✅ Design-token bleed: C-mark inline background = warm accent `#f0a062`

Operator visual closure at HALT-1 (this commit) is the residual for pixel-level fidelity (anti-aliasing, color saturation, animation timing).

## §7 — Operator-arbitrated decisions (Q-W3-1..8 + Path-B)

See `mb-t-mvp-w3-conductor-chat-decisions-2026-05-17.md` §II + §I for full enumeration.

## §8 — Cross-session coordination

See `mb-t-mvp-w3-conductor-chat-impl-coord-2026-05-17.md` for the per-event timeline and discipline-outcome surface. Coord log persisted at `docs/coordination/w3-cross-session-2026-05-17.md`.

## §9 — Followups filed at WB-final

| ID | Tier | Closure path |
|----|------|--------------|
| `MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED` | 1 | shell.html `<script>` + main.ts sentinel + tsconfig amendment + chat-shell removal + real bridge implementation |
| `MB-F-W3-FINAL-CHAT-SHELL-SWEEP-COORDINATION-PENDING` | 1 | chat-shell DEFERRED DELETION + bottom-rail meters re-home into W1 EXPANSION-2 topbar |
| `MB-F-W3-WB6-ATTACHED-STATE-SCREENSHOT-COVERAGE-PENDING` | 2 | Operator captures attached-state screenshots; probe-06 extends |
| `MB-F-W3-VISUAL-FIDELITY-CSS-INJECTOR-PENDING` | 3 | `<style>` tag injection in mount.ts for typing `@keyframes` + `.buildmd-chip-x:hover` |

## §10 — Known limitations (Path-B envelope)

1. **Production-bridge absent** — `window.conductorChatBridge` is not registered by main process. Renderer mounts with `DEFAULT_IDLE_STATE` per Path-B; user interactions (send/attach/etc.) call no-op callbacks until the bridge ships.
2. **No production mount point** — `workstation-shell.html` does not load `dist/conductor-chat/renderer.js` (bundle script not authored; READ-ONLY territory for W3).
3. **Workstation typecheck fails** — `src/conductor-chat/{*.tsx,index.ts,mount.ts}` not in tsconfig.json `exclude` list; pre-existing-style blocker matching the pattern for tile-grid / chat-shell / etc. Fix is one-line operator-stamp envelope amendment.
4. **BuildMdChip cross-session stub** — operator-CC's `composer.tsx:48-53` renders a placeholder stub div; the real BuildMdChip body (`build-md-chip.tsx`) is NOT yet composed inside operator-CC's composer. Composer-swap deferred to W3-final sweep.
5. **CSS pseudo-states + @keyframes** — typing-dot animation + `.buildmd-chip-x:hover` cannot live in `React.CSSProperties`. Static fallback ships at WB2/WB3; deferred to `MB-F-W3-VISUAL-FIDELITY-CSS-INJECTOR-PENDING` Tier-3.
6. **Attached-state visual oracle** — design did not capture attached-state screenshots. Probe-06 covers idle only; attached-state DOM passes via probe-07 integration test but no normative screenshot exists.

## §11 — Cross-references

- Findings: `docs/coordination/mb-t-mvp-w3-conductor-chat-findings-2026-05-17.md`
- Decisions: `docs/coordination/mb-t-mvp-w3-conductor-chat-decisions-2026-05-17.md`
- Impl-coord: `docs/coordination/mb-t-mvp-w3-conductor-chat-impl-coord-2026-05-17.md`
- Cross-session log: `docs/coordination/w3-cross-session-2026-05-17.md`
- FROZEN testid contract: `docs/coordination/w3-testid-contract-2026-05-17.md`
- Design oracle: `docs/design-handoff/conductor-v-mvp/project/`
- Operator §5.3 arbitration: commit `94d3e17`
- Cross-session amendment: commits `9625e04` + `f6eeb71`
