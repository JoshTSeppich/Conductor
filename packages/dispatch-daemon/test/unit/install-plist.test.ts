/**
 * DAEMON-T18 — plist generation unit tests.
 *
 * Covers the pure function that produces the launchd LaunchAgent
 * plist XML from resolved paths + labels. The plist template is
 * spike-validated per S04 ADR §"plist template that works on
 * current macOS" (verbatim reference).
 *
 * Probes (2 in this file):
 *   P1 generatePlist returns a well-formed plist with all required
 *      keys: Label, ProgramArguments (node + daemon-script abs
 *      paths), KeepAlive, RunAtLoad, StandardOutPath,
 *      StandardErrorPath
 *   P2 Label is the reverse-DNS-style 'com.foxworks.dispatch-
 *      daemon' (locks the convention against drift; matches S04
 *      verbatim and CS-03 anchor)
 *
 * Both probes test the pure helper. The launchctl bootstrap
 * boundary is smoke-tested at operator install time per
 * finding #36 framework (cairn discipline adaptation for
 * system-integration boundaries).
 */

import { describe, expect, it } from 'vitest';
import { generatePlist } from '../../src/install/plist.js';

describe('DAEMON-T18 — generatePlist', () => {
  it('P1 returns well-formed plist with all S04-required keys; programArguments preserved in order', () => {
    // DAEMON-Z-1 Path B test-mechanism-adaptation per finding #29:
    // generatePlist refactored from fixed (nodePath, daemonScript)
    // pair to programArguments: readonly string[] to support
    // `node --import tsx src/index.ts` 4-arg shape. Test feeds
    // a 4-arg array; assertions verify each arg appears in
    // order in the rendered plist.
    const xml = generatePlist({
      label: 'com.foxworks.dispatch-daemon',
      programArguments: [
        '/usr/local/bin/node',
        '--import',
        'tsx',
        '/Users/op/foxworks-dispatch/packages/dispatch-daemon/src/index.ts',
      ],
      stdoutPath: '/Users/op/.foxworks-dispatch/logs/daemon.out.log',
      stderrPath: '/Users/op/.foxworks-dispatch/logs/daemon.err.log',
    });

    // XML preamble + DOCTYPE per Apple's PropertyList DTD
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain(
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"',
    );
    expect(xml).toContain('<plist version="1.0">');

    // Required structural keys per S04 §"plist template"
    expect(xml).toContain('<key>Label</key>');
    expect(xml).toContain('<key>ProgramArguments</key>');
    expect(xml).toContain('<key>KeepAlive</key>');
    expect(xml).toContain('<key>RunAtLoad</key>');
    expect(xml).toContain('<key>StandardOutPath</key>');
    expect(xml).toContain('<key>StandardErrorPath</key>');

    // ProgramArguments contains all 4 arguments in order
    const argsBlock = xml.match(
      /<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/,
    );
    expect(argsBlock).not.toBeNull();
    expect(argsBlock![1]).toContain('<string>/usr/local/bin/node</string>');
    expect(argsBlock![1]).toContain('<string>--import</string>');
    expect(argsBlock![1]).toContain('<string>tsx</string>');
    expect(argsBlock![1]).toContain(
      '<string>/Users/op/foxworks-dispatch/packages/dispatch-daemon/src/index.ts</string>',
    );

    // KeepAlive + RunAtLoad both true (S04 default per §"3. KeepAlive")
    expect(xml).toMatch(/<key>KeepAlive<\/key>\s*<true\s*\/>/);
    expect(xml).toMatch(/<key>RunAtLoad<\/key>\s*<true\s*\/>/);

    // Stdout + stderr paths embedded
    expect(xml).toContain(
      '<string>/Users/op/.foxworks-dispatch/logs/daemon.out.log</string>',
    );
    expect(xml).toContain(
      '<string>/Users/op/.foxworks-dispatch/logs/daemon.err.log</string>',
    );

    // Closes cleanly
    expect(xml.trimEnd().endsWith('</plist>')).toBe(true);
  });

  it('P2 label is reverse-DNS com.foxworks.dispatch-daemon (locks CS-03 anchor)', () => {
    const xml = generatePlist({
      label: 'com.foxworks.dispatch-daemon',
      programArguments: ['/n', '/d/src/index.ts'],
      stdoutPath: '/o',
      stderrPath: '/e',
    });
    expect(xml).toMatch(
      /<key>Label<\/key>\s*<string>com\.foxworks\.dispatch-daemon<\/string>/,
    );
  });
});
