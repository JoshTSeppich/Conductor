// MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP WB2 RED — mount.ts prod
// wiring probe for the renderer-safe StatusListClient + statusListClient
// prop pass-through to TileGridApp.
//
// Closes MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED
// (Tier 1; FOLLOWUPS.md:367). Per gen-6 OPT-β arbitration 2026-05-16:
// mount.ts builds a renderer-safe StatusListClient using
// `window.workstationBridge.getDaemonToken()` (preload bridge shipped at
// WB1 GREEN `2a93e00`) + native `fetch` on `/v2/sessions` with the
// `X-Conductor-Token` header. The client is passed to `<TileGridApp
// statusListClient={...} />`, closing the dogfood-blocking gap that
// originated at MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB-final
// amendment `4a9633c` (Option A dropped the inline `new
// HttpSessionListClient()` fallback because session-cap.ts pulls
// node:fs/path/os into the renderer bundle).
//
// Probe shape: text-pattern over mount.ts source (matches dispatch §47-
// 49 prescription "Assert mount.ts text contains `statusListClient` prop
// pass to TileGridApp / Assert mount.ts text imports/instantiates the
// resolved Q-PHASE5PW-1 mechanism"). Mount.ts is auto-mount entry point;
// the production behavior is exercised at runtime via the WB-final smoke
// (CLAUDE.md §4.6) — text-pattern probe is the unit-test-tier ratification
// that the code path was authored, separate from the runtime check.
//
// RED at HEAD: mount.ts (verified at HALT 0 direct read) does not
// thread `statusListClient` into the TileGridApp createElement call;
// the post-`4a9633c` shape passes only workstationBridge / consoleBridge
// / createTerminal.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MOUNT_PATH = resolve(
  __dirname,
  '../../../src/tile-grid/mount.ts',
);

describe('MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP WB2 — mount.ts prod wiring', () => {
  it('mount.ts threads statusListClient prop into the TileGridApp createElement call', () => {
    const text = readFileSync(MOUNT_PATH, 'utf8');
    // The createElement(TileGridApp, {...}) block currently passes
    // workstationBridge / consoleBridge / createTerminal only (verified
    // at HEAD `00ea555` pre-WB2). Adding statusListClient is the
    // canonical closure shape per FOLLOWUPS row 367.
    expect(text).toMatch(/statusListClient\s*[:,]/);
  });

  it('mount.ts uses window.workstationBridge.getDaemonToken (the preload bridge shipped at WB1 GREEN 2a93e00)', () => {
    const text = readFileSync(MOUNT_PATH, 'utf8');
    // Per OPT-β: renderer-safe StatusListClient sources token from the
    // workstationBridge.getDaemonToken bridge (no direct node imports).
    expect(text).toMatch(/getDaemonToken/);
  });

  it('mount.ts issues fetch against /v2/sessions (the daemon route HttpSessionListClient consumes in main.ts)', () => {
    const text = readFileSync(MOUNT_PATH, 'utf8');
    // Per CONDUCTOR_API_CONTRACT.md §4.2 the session list lives at GET
    // /v2/sessions. The renderer-side adapter must hit the same route
    // (with the X-Conductor-Token header) to satisfy the StatusListClient
    // interface (session-status-source-poll.ts:47-55).
    expect(text).toMatch(/\/v2\/sessions/);
    expect(text).toMatch(/X-Conductor-Token/);
  });

  it('mount.ts declares the prod-wiring inside a MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP sentinel zone (CLAUDE.md §3.3)', () => {
    const text = readFileSync(MOUNT_PATH, 'utf8');
    // New zone in mount.ts marks the production-wiring region for
    // future grep-discovery. Bounds the renderer-safe StatusListClient
    // adapter so future contributors can locate it from the FOLLOWUPS
    // row pointer trail.
    expect(text).toMatch(
      /=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP[\s\S]+statusListClient[\s\S]+=== END: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP/,
    );
  });
});
