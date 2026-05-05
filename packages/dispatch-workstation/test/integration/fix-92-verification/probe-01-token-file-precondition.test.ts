// Probe-92 / Probe 1 — token file precondition.
//
// Asserts that ~/.foxworks-dispatch/token (the disk source of truth read
// by Fix-92's IPC handler at main.ts:216 → daemon-token-bootstrap.ts:43)
// is present, mode 600, non-empty, and a single trimmed string.
//
// This is an OPERATOR-STATE probe, not a Fix-92 logic probe. If it fails,
// the operator's local environment is misconfigured (no daemon installed,
// or token file corrupted) — Fix-92 itself is silent-on-error in that
// case (daemon-token-bootstrap.ts:46 catch → null), and TokenPrompt
// remains the fallback. Probe 9 verifies that fallback path explicitly.
//
// Cairn label: KNOWN — every assertion exercises real disk state through
// the same path (statSync + readFileSync) that the production code uses.
// No mocks, no stubs.
//
// Cairn red→green note: the original RED for Fix-92 lives at commit
// 3347114 (test/unit/fix-92-daemon-token/test_daemon_token_bootstrap.spec.ts);
// the GREEN closure is 90abbb5. This integration probe verifies the
// post-green operator-state precondition that the IPC handler needs to
// observe a non-null token.
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TOKEN_PATH = join(homedir(), '.foxworks-dispatch', 'token');

describe('Probe-92 / Probe 1 — token file precondition', () => {
  it(
    'token file exists at ~/.foxworks-dispatch/token, is mode 600, non-empty, and trims to a single string',
    () => {
      // KNOWN: existsSync via statSync — throws if absent.
      let stat;
      try {
        stat = statSync(TOKEN_PATH);
      } catch (err) {
        throw new Error(
          `token file not found at ${TOKEN_PATH}; operator state issue, ` +
            `not a Fix-92 defect. Run the daemon installer or restore the ` +
            `token file. Underlying: ${(err as Error).message}`,
        );
      }

      // KNOWN: file mode bits — & 0o777 strips file-type bits, leaves perms.
      // Unix mode 600 = rw------- = owner read/write only. The daemon
      // creates the token file with this mode (see dispatch-daemon
      // lifecycle/auth.ts) — anything else suggests post-creation
      // tampering.
      const mode = stat.mode & 0o777;
      expect(
        mode,
        `expected token file mode 0o600; got 0o${mode.toString(8)}. ` +
          `Mode mismatch suggests the file was rewritten outside the ` +
          `daemon's lifecycle.`,
      ).toBe(0o600);

      // KNOWN: file size > 0 — empty token file would be a daemon bug.
      expect(
        stat.size,
        `expected non-empty token file; got ${stat.size} bytes`,
      ).toBeGreaterThan(0);

      // KNOWN: file contents are a single trimmed string. The token is
      // read with .trim() in five module-private readDaemonToken helpers
      // and in daemon-token-bootstrap.ts:45. We mirror that read here so
      // the assertion exercises the exact normalization path. We do NOT
      // log the value (defense-in-depth — never echo tokens to test
      // stdout, see operator's #5 ack).
      const raw = readFileSync(TOKEN_PATH, 'utf8');
      const trimmed = raw.trim();

      expect(
        trimmed.length,
        `expected non-empty trimmed token; got 0-length after trim`,
      ).toBeGreaterThan(0);

      // KNOWN: no embedded whitespace mid-string — trimmed token must be
      // a single token, not a multi-line file. If the daemon ever writes
      // multi-line tokens this assertion catches it.
      expect(
        /\s/.test(trimmed),
        `expected single trimmed string with no internal whitespace`,
      ).toBe(false);
    },
  );
});
