# MB-S04 — vitest-spawn-and-observe Electron spike

Validates the test approach for the MB-T01 Red criterion (V3_TICKETS.md L104):
*"spawn built app, assert process starts, window appears, exits cleanly on
quit."*

## Status

Run 2026-04-30. **5/5 experiments pass.** ADR landed at
`docs/adr/MB-S04-vitest-electron-spawn.md`. Evidence at `results/evidence.md`.

## Run

```
bash packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn/run.sh
```

To reproduce S-04-05 (packaged-app mode), the .app must first be built:

```
cd packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn
npx --yes @electron/packager packaged-app MB-S04-target \
  --platform=darwin --arch=arm64 \
  --out=results/packaged-out --overwrite \
  --electron-version=$(node -p "require('../../node_modules/electron/package.json').version")
```

S-04-05 is `it.skipIf(!existsSync(PACKAGED_APP_BIN))(...)` — silently skipped
if the .app hasn't been built. The other 4 experiments run unconditionally.

## Experiments

- **S-04-01:** `spawn electron <main.mjs>` and observe `SPIKE_READY` sentinel
  on child stdout. Validates the dev-mode spawn-and-observe primitive.
- **S-04-02:** SIGTERM clean-exit shape. Records both exit-code shapes
  (code === 0 vs code === null + signal === 'SIGTERM') as acceptable.
- **S-04-03:** stdin-line `QUIT` clean-exit. Deterministic exit code 0.
  This is the primary quit channel recommended for the Red criterion.
- **S-04-04:** Full cycle timing — captures spawn-to-ready and
  ready-to-exit milliseconds for the dev-mode path.
- **S-04-05:** Packaged `.app` mode — same primitives validated against
  the binary inside `<App>.app/Contents/MacOS/`. Skipped if .app absent.

## Cited

- `docs/adr/UI-S02-menubar-framework.md` — Electron 33+ chosen 2026-04-23,
  hello-world worked first try (KNOWN baseline).
- `docs/build-docs/V3_TICKETS.md` L104 — MB-T01 Red criterion text.
- `packages/dispatch-workstation/spikes/UI-S02-framework-choice/electron/`
  — UI-S02 Electron hello-world (different scope: tray + notifications,
  not BrowserWindow + spawn-observe).
