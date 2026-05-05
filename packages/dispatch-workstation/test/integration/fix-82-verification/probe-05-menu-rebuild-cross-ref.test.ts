// Fix-82 / Probe 5 — menu rebuild propagation cross-reference.
//
// Cairn finding #82 PARTIAL-RESOLVED at 320f707 was completed by
// finding #89 (MB-F-WORKSTATION-MENU-REBUILD-NO-OP) which shipped
// the macOS menu bar OS-level reattachment (Menu.setApplicationMenu(
// null) precursor before the rebuild). Without #89, Fix-C wiring
// would invoke refreshConsoleMenu(<sessions>) JS-side correctly but
// the OS menu cache would remain pinned to the initial empty-state
// — the operator-visible symptom would persist despite #82 wiring.
//
// The probe-89 suite at fix-89-menu-rebuild/probe-01-menu-rebuild-
// propagates.test.ts is the canonical assertion of OS-level menu
// propagation: it drives REFRESH_CONSOLE_MENU via stdin then
// introspects the macOS native "CC Console" submenu via AppleScript
// /System Events to verify the JS-side rebuild reached the OS menu
// bar. Re-implementing that ~450 LOC of AppleScript + descendant-PID
// resolution here would be redundant.
//
// Per operator arbitration on cross-ref scope (test-batch-1 prompt):
// keep cross-references as fail-loud test files, not REPORT.md prose.
// If the fix-89 probe is renamed, moved, or gutted, this probe goes
// RED — operator notices immediately rather than discovering coverage
// drift by accident later.
//
// KNOWN: pure-fs assertions; no Electron, no daemon, no AppleScript
// invocation in this probe (the cross-referenced probe owns that).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROBE_89 = resolve(
  __dirname,
  '../fix-89-menu-rebuild/probe-01-menu-rebuild-propagates.test.ts',
);

describe('Fix-82 / Probe 5 — menu rebuild propagation cross-ref to probe-89', () => {
  it('fix-89-menu-rebuild/probe-01 exists at expected path', () => {
    // Fail-loud: rename / delete / move of the cross-referenced probe
    // trips this immediately. Operator must update cross-ref OR replace
    // the coverage; silent drift impossible.
    expect(
      existsSync(PROBE_89),
      `expected fix-89 probe at ${PROBE_89}; ` +
        `if intentionally moved, update this cross-ref`,
    ).toBe(true);
  });

  it('cross-referenced probe still asserts OS-level menu-bar propagation', () => {
    // Sanity: a no-op or gutted probe at the linked path would make the
    // cross-reference meaningless. We assert the probe still contains
    // the substantive AppleScript-driven menu introspection that closes
    // the #82 + #89 verification gap.
    //
    // Specifically: it must drive REFRESH_CONSOLE_MENU via stdin AND
    // introspect the macOS native menu bar (System Events / menu bar
    // item "CC Console") AND assert the rebuilt session name is present.
    const src = readFileSync(PROBE_89, 'utf8');
    expect(src).toMatch(/REFRESH_CONSOLE_MENU /);
    expect(src).toMatch(/REFRESH_CONSOLE_MENU_DONE/);
    expect(src).toMatch(/System Events/);
    expect(src).toMatch(/menu bar item "CC Console"/);
    // The probe asserts the rebuild propagated by checking that
    // PROBE_SESSION_NAME ('probe-session-fix89') appears under the
    // submenu items. Survival of that assertion is what makes the
    // cross-ref load-bearing.
    expect(src).toMatch(/probe-session-fix89/);
    expect(src).toMatch(/toContain\(PROBE_SESSION_NAME\)/);
  });

  it('cross-referenced probe is platform-gated (darwin-only) — same as #89 native menu surface', () => {
    // KNOWN-non-claim about the host running this test: the probe-89
    // assertion only exercises on darwin. We document that constraint
    // here so any operator porting the suite to Linux/Windows knows
    // they need a separate path. (Per finding #89 resolution — macOS
    // setApplicationMenu cache is the only platform-specific
    // observation site.)
    const src = readFileSync(PROBE_89, 'utf8');
    expect(src).toMatch(/process\.platform === 'darwin'/);
  });
});
