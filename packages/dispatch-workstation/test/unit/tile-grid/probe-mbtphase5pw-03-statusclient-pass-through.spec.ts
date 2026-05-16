// MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP WB1 RED — preload bridge
// pass-through probe for the renderer-safe StatusListClient mechanism.
//
// Closes MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED
// (Tier 1; FOLLOWUPS.md:367). Per gen-6 OPT-β arbitration 2026-05-16
// (manifest EXPANSION-1 `735703f`): mount.ts cannot import
// HttpSessionListClient from src/main/session-cap.ts because session-cap.ts
// pulls node:fs/path/os into the renderer bundle (the build-break
// confirmed at `4a9633c` Option A amendment). The renderer-safe path is:
//
//   preload.mts exposes window.workstationBridge.getDaemonToken()
//     → wraps existing ipcMain.handle('workstation:get-daemon-token', ...)
//       at main.ts:466 (Fix-92 sentinel zone; main process reads
//       ~/.foxworks-dispatch/token via node:fs in node context)
//   mount.ts (WB2) builds StatusListClient using
//     window.workstationBridge.getDaemonToken() + fetch on /v2/sessions
//
// This probe pins the preload-side half: the bridge method must exist
// and route to the existing IPC channel. No new IPC channel (no
// WORKSTATION_CONTRACT.md §6 amendment) — channel
// 'workstation:get-daemon-token' is pre-existing per Fix-92 (cairn
// finding #92).
//
// Probe shape: text-pattern over preload.mts source (matches the
// CONSOLE-T02 / MB-T22 / MB-T24 / §C.1′ convention of text-asserting
// preload bridge wiring; preload runs in a sandboxed context that's
// not directly unit-testable without booting Electron).
//
// RED at HEAD: preload.mts does not declare `getDaemonToken:` on
// workstationBridge (verified by grep at HALT 0).
//
// Sub-Q-PHASE5PW-1 disposition: OPT-β (preload bridge only; no new
// IPC channel; mount.ts uses fetch + token). Auto-ack ARBITRATED by
// gen-6 2026-05-16 per ANNOUNCEMENT.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRELOAD_PATH = resolve(
  __dirname,
  '../../../src/main/preload.mts',
);

describe('MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP WB1 — preload bridge', () => {
  it('preload.mts exposes workstationBridge.getDaemonToken method (statusclient pass-through machinery)', () => {
    const text = readFileSync(PRELOAD_PATH, 'utf8');
    // The bridge method that mount.ts will call to obtain the daemon
    // token without importing node:fs. Mirrors the existing
    // workstationBridge method-list pattern (e.g.,
    // `getSessionApprovalPolicy: (sessionName: string) => ipcRenderer
    // .invoke('workstation:approval-policy-get', { sessionName })`).
    expect(text).toMatch(/getDaemonToken\s*:/);
  });

  it('preload.mts routes getDaemonToken through the pre-existing workstation:get-daemon-token IPC channel (no new channel; Fix-92 reuse)', () => {
    const text = readFileSync(PRELOAD_PATH, 'utf8');
    // Reuses the Fix-92 main.ts:466 handler. Reuse is operator-
    // arbitrated under OPT-β (no WORKSTATION_CONTRACT.md §6 amendment).
    // The substring assertion is strict enough that an accidental
    // routing through a typo'd channel name would fail.
    expect(text).toMatch(/workstation:get-daemon-token/);
  });

  it('preload.mts declares the bridge inside a MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP sentinel zone (CLAUDE.md §3.3)', () => {
    const text = readFileSync(PRELOAD_PATH, 'utf8');
    // New addition lives in a NEW sentinel block per CLAUDE.md §3.3
    // ("Add new logic in NEW sentinel blocks outside existing zones").
    // The zone name is the ticket name so future grep-discovery
    // anchors at this commit.
    expect(text).toMatch(
      /=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP[\s\S]+getDaemonToken[\s\S]+=== END: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP/,
    );
  });
});
