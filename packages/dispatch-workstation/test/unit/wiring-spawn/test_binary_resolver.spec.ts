// Batch 6 Session A — followup MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION
// (cairn finding #72).
//
// resolveClaudeBin is a thin wrapper around `which claude` (or an
// injected locator) that surfaces a typed error when the binary is
// not on PATH. The workstation calls this once at startup and threads
// the absolute path through SpawnHandlerDeps so tmux argv contains
// /Users/<u>/.local/bin/claude or /opt/homebrew/bin/claude verbatim,
// bypassing tmux's PATH lookup inside the closed-allowlist env.
//
// RED phase: the binary-resolver module does not exist yet. Tests
// fail at import time. GREEN adds packages/dispatch-workstation/src/
// main/binary-resolver.ts.

import { describe, it, expect } from 'vitest';
import {
  resolveClaudeBin,
  ClaudeBinNotFoundError,
} from '../../../src/main/binary-resolver.js';

describe('binary-resolver — resolveClaudeBin (cairn #72)', () => {
  it('R1 returns the absolute path when injected runWhich resolves with a non-empty stdout', async () => {
    const path = await resolveClaudeBin({
      runWhich: async (cmd) => {
        expect(cmd).toBe('claude');
        return '/Users/operator/.local/bin/claude';
      },
    });
    expect(path).toBe('/Users/operator/.local/bin/claude');
  });

  it('R2 trims trailing newline from runWhich output (which behavior parity)', async () => {
    const path = await resolveClaudeBin({
      runWhich: async () => '/opt/homebrew/bin/claude\n',
    });
    expect(path).toBe('/opt/homebrew/bin/claude');
  });

  it('R3 throws ClaudeBinNotFoundError when runWhich returns empty stdout', async () => {
    await expect(
      resolveClaudeBin({ runWhich: async () => '' }),
    ).rejects.toBeInstanceOf(ClaudeBinNotFoundError);
  });

  it('R4 throws ClaudeBinNotFoundError when runWhich rejects (claude not on PATH)', async () => {
    await expect(
      resolveClaudeBin({
        runWhich: async () => {
          throw new Error('exit 1: which: claude not found');
        },
      }),
    ).rejects.toBeInstanceOf(ClaudeBinNotFoundError);
  });

  it('R5 ClaudeBinNotFoundError carries a human-readable message naming the binary', async () => {
    try {
      await resolveClaudeBin({ runWhich: async () => '' });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ClaudeBinNotFoundError);
      expect((e as Error).message.toLowerCase()).toContain('claude');
    }
  });
});
