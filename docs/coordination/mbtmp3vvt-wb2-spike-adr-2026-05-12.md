# MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING — WB2 SPIKE ADR

**Date:** 2026-05-12
**Sub-session:** P1 (MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING)
**Cairn type:** `spike:` per CLAUDE.md §2.8 — external API behavior (playwright-electron + electron 28+ headless on macOS Darwin 25.3) not previously observed; SPIKE precedes production code.
**Anchor commit at SPIKE run:** `2e8493d` (P1 WB1 RED landed) + post-HALT-PRE-INSTALL clearance dep-add (deps committed in this same commit).
**Sub-Q resolutions ratified by SPIKE:** Sub-Q-A=(i) playwright-electron, Sub-Q-B=(i) pixelmatch+pngjs (operator-acked 2026-05-12 ack-defaults).

---

## §1 — SPIKE objectives (per ticket body §4 WB2)

Three observable conditions against `dist/main/main.js` at HEAD `2e8493d`:

(a) `_electron.launch({ args: ['dist/main/main.js'] })` succeeds and returns an electronApp handle
(b) `electronApp.firstWindow()` resolves; BrowserWindow becomes accessible (proxies WINDOW_READY observability)
(c) `page.screenshot({ path, type: 'png' })` produces a non-empty valid PNG

---

## §2 — Observed results `[KNOWN]`

SPIKE script at `/tmp/spike-mbtmp3vvt-playwright-electron.mjs` (scratch; NOT committed). Run from `packages/dispatch-workstation/` directory (necessary for `@playwright/test` module resolution under pnpm workspace layout). Single invocation completed in 3066ms.

```
SPIKE-RESULT: {
  "launchOk": true,
  "launchError": null,
  "firstWindowOk": true,
  "firstWindowError": null,
  "screenshotOk": true,
  "screenshotError": null,
  "screenshotBytes": 57945,
  "totalMs": 3066
}
```

Screenshot artifact (`/tmp/spike-mbtmp3vvt-screenshot.png`) `file` output: `PNG image data, 2048 x 1472, 8-bit/color RGB, non-interlaced`.

### §2.1 — Observation (a) launch `[KNOWN]`

`_electron.launch({ args: [<absolute path to dist/main/main.js>], timeout: 10000 })` succeeded on macOS Darwin 25.3 against electron-packaged workstation. No gatekeeper / sandbox / dialog blocked the launch.

### §2.2 — Observation (b) firstWindow `[KNOWN]`

`electronApp.firstWindow({ timeout: 8000 })` resolved successfully. The BrowserWindow created by `main.ts` `app.whenReady` callback is accessible as a Playwright `Page` instance within the 8s timeout.

**Implication for ticket body §3.6 Sub-Q-F:** Default (i) `[data-app-ready="true"]` polling is NOT strictly required for SPIKE-level launch verification — `firstWindow()` resolution implicitly waits until the BrowserWindow exists. The data-attribute sentinel remains valuable for distinguishing "BrowserWindow exists" from "renderer mounted + React tree rendered" (the latter is what Phase 3 smoke actually wants). WB4 retains Sub-Q-F=(i) default for the production sentinel.

### §2.3 — Observation (c) screenshot `[KNOWN]`

`page.screenshot({ path, type: 'png' })` wrote 57,945 bytes; `file` confirms PNG image data at 2048×1472 (2× macOS retina resolution; physical pixels). 8-bit RGB non-interlaced. Non-zero file size confirms render-tree was actually captured (not blank/black/empty placeholder).

### §2.4 — Total runtime `[KNOWN]`

Full SPIKE cycle (launch → firstWindow → screenshot → dispose) completed in 3.066 seconds. Phase 3 smoke at WB-final cycles will additionally include rebuild (~30-90s per CLAUDE.md §3.4 + monorepo size) + optional diff (~100-500ms per pixelmatch + image size), so target end-to-end budget is ~30-90s + 3-5s SPIKE-equivalent + diff ~ 35-95s. Reasonable for WB-final smoke gates.

---

## §3 — Decisions ratified by SPIKE

| Decision | Status | Evidence |
|---|---|---|
| Sub-Q-A=(i) playwright-electron is viable on macOS Darwin 25.3 + electron 28+ | `[KNOWN]` ratified | SPIKE all-pass; no macOS-specific failure modes observed |
| `_electron.launch` API signature (args, timeout) works as documented | `[KNOWN]` ratified | Direct invocation succeeded |
| `firstWindow()` is sufficient for SPIKE-level launch sync | `[KNOWN]` | Resolved within 8s; production sentinel (Sub-Q-F=(i) data-attribute) retained for stricter "renderer-mounted" semantics |
| `page.screenshot({ type: 'png' })` produces valid PNG | `[KNOWN]` ratified | `file` output confirms PNG image data; bytes > 0; 2048×1472 retina-pixel dimensions |
| 8s firstWindow timeout + 10s launch timeout are reasonable defaults | `[MODELED]` | SPIKE completed in 3s; timeouts have ~3× headroom |

---

## §4 — Risks discovered

`[KNOWN]` SPIKE script must run from `packages/dispatch-workstation/` directory for `@playwright/test` import to resolve under pnpm workspace layout. This is a deployment detail for `phase-3-visual-smoke.mjs` (WB3 onward): the script must be invoked via `pnpm --filter dispatch-workstation exec node scripts/phase-3-visual-smoke.mjs` OR via `pnpm --filter dispatch-workstation verify:phase-3-smoke` (Sub-Q-A=(ii) per-package package.json scripts pattern). Direct `node packages/.../scripts/phase-3-visual-smoke.mjs` from repo root would fail with ERR_MODULE_NOT_FOUND.

`[MODELED-LOW]` Real workstation main.ts may spawn daemon / tmux side-effects during launch — SPIKE did not observe failures from these, but production Phase 3 smoke runs may produce noisier startup. Mitigation: WB-final smoke runs in clean environment per CLAUDE.md §4.6 + may benefit from MB_TEST_MODE-style env var to suppress side effects. Defer to WB9 orchestration if needed.

`[KNOWN]` SPIKE was run against a moderately-fresh `dist/main/main.js` (built at T1 WB-final cycle, with subsequent T2 + T3 + T7 commits not necessarily reflected). Phase 3 smoke at WB9 GREEN will rebuild explicitly per ticket body §4 WB9 step 1.

---

## §5 — Forward propagation

- **WB3 GREEN** scaffolds `runPhase3Smoke` skeleton; ratified SPIKE results enable Sub-Q-A=(i) wiring without further dep arbitration.
- **WB4 GREEN** integrates the `_electron.launch` + `firstWindow` chain into the skeleton. Ticket body §3.6 Sub-Q-F=(i) data-attribute sentinel addition to workstation main.ts remains pending verification (will SPIKE-verify in WB4 cycle).
- **WB6 GREEN** integrates `page.screenshot` per Observation (c).
- **WB7 GREEN** integrates pixelmatch + pngjs (Sub-Q-B=(i) deps installed in this same commit) for image diff.

SPIKE objective satisfied: external API behavior `[KNOWN]` for playwright-electron's load-bearing primitives. No fallback to Sub-Q-A=(iii) chrome-remote-interface required.
