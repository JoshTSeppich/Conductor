/**
 * DAEMON-T19 — uninstaller logic unit tests.
 *
 * Covers the two pure helpers the T19 entry script composes:
 * --clean flag parsing and bootout-command formatting. The
 * actual `launchctl bootout` invocation is a thin OS-boundary
 * wrapper smoke-tested by the operator (finding #36 framework,
 * same primitive as T18's bootstrap wrapper).
 *
 * Probes (2 in this file):
 *   P5 parseUninstallArgs:
 *      - ['--clean'] → {clean: true}
 *      - [] (default) → {clean: false}
 *      Locks the positional flag-parse semantic without
 *      pulling in a CLI library.
 *   P6 formatBootoutCommand({uid: '501', label: '...'}) →
 *      'launchctl bootout gui/501/com.foxworks.dispatch-daemon'
 *      Locks the S04 §"Install / uninstall commands" verbatim
 *      shape; smoke-test parity with the actual exec call.
 */

import { describe, expect, it } from 'vitest';
import { parseUninstallArgs } from '../../src/install/uninstall-args.js';
import { formatBootoutCommand } from '../../src/install/launchctl.js';

describe('DAEMON-T19 — uninstaller logic', () => {
  it('P5 parseUninstallArgs handles --clean flag and default', () => {
    expect(parseUninstallArgs(['--clean'])).toEqual({ clean: true });
    expect(parseUninstallArgs([])).toEqual({ clean: false });
    // Order shouldn't matter; flag elsewhere in argv still detected
    expect(parseUninstallArgs(['--something-else', '--clean'])).toEqual({
      clean: true,
    });
    // Non-clean args yield default false
    expect(parseUninstallArgs(['--verbose'])).toEqual({ clean: false });
  });

  it('P6 formatBootoutCommand returns S04-verbatim launchctl command', () => {
    expect(
      formatBootoutCommand({
        uid: '501',
        label: 'com.foxworks.dispatch-daemon',
      }),
    ).toBe(
      'launchctl bootout gui/501/com.foxworks.dispatch-daemon',
    );
    // Different uid renders correctly
    expect(
      formatBootoutCommand({
        uid: '1001',
        label: 'com.foxworks.dispatch-daemon',
      }),
    ).toBe(
      'launchctl bootout gui/1001/com.foxworks.dispatch-daemon',
    );
  });
});
