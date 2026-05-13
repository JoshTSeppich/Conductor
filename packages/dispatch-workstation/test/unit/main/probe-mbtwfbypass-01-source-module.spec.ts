// MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB1 RED —
// probe: bypass-perms-source.ts module presence + factory + behavior.
//
// Round 11 §3.9 SPECULATIVE Wave 4 — manifest at phase4-t9-bypass-perms.txt
// scopes daemon FORBIDDEN, dispatch-core FORBIDDEN, sibling components
// FORBIDDEN. Workstation main-process aggregator is the in-territory path.
//
// Per ticket body §3.1 Sub-Q-A=(α) pluggable-source skeleton: mirrors
// T9 rate-limit-aggregator pattern (3fef80d). createBypassPermsSource()
// factory returns:
//   {
//     recordSpawn(name: string, mode: 'auto' | 'ask'): void
//     getActiveBypassCount(): number
//     onUpdate(cb: (count: number) => void): () => void
//   }
// State: in-memory Map<sessionName, 'auto' | 'ask'>. getActiveBypassCount
// = count of entries with mode === 'auto'. Subscribers fire on each
// recordSpawn (regardless of mode — ensures count-zero updates propagate).
//
// Encoded contract (6 conditions, all RED at HEAD 42cede6):
//   (1) Module src/main/bypass-perms-source.ts exists.
//   (2) Module exports createBypassPermsSource as a function.
//   (3) recordSpawn(name, 'auto') increments getActiveBypassCount() by 1;
//       recordSpawn(name, 'ask') does NOT increment.
//   (4) Re-recording the same name with a different mode replaces the
//       entry (not double-counted).
//   (5) onUpdate(cb) fires the callback on each recordSpawn; dispose
//       function deregisters.
//   (6) getActiveBypassCount is deterministic — repeated calls with no
//       intervening recordSpawn return the same number.
//
// Flips RED → GREEN at WB2 (module ship).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const SOURCE_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/bypass-perms-source.ts',
);

describe('MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB1 RED — bypass-perms-source presence', () => {
  it('Condition (1): src/main/bypass-perms-source.ts exists at filesystem', () => {
    expect(existsSync(SOURCE_PATH)).toBe(true);
  });
});

describe('MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB1 RED — createBypassPermsSource behavior', () => {
  it('Condition (2): createBypassPermsSource is exported as a function', async () => {
    let fn: unknown;
    try {
      const mod = await import('../../../src/main/bypass-perms-source.js');
      fn = (mod as { createBypassPermsSource?: unknown })
        .createBypassPermsSource;
    } catch {
      fn = undefined;
    }
    expect(typeof fn).toBe('function');
  });

  it('Condition (3): recordSpawn(name, "auto") increments count; recordSpawn(name, "ask") does NOT', async () => {
    const mod = await import('../../../src/main/bypass-perms-source.js');
    const createBypassPermsSource = (
      mod as {
        createBypassPermsSource: () => {
          recordSpawn(name: string, mode: 'auto' | 'ask'): void;
          getActiveBypassCount(): number;
          onUpdate(cb: (count: number) => void): () => void;
        };
      }
    ).createBypassPermsSource;

    const source = createBypassPermsSource();
    expect(source.getActiveBypassCount()).toBe(0);

    source.recordSpawn('session-a', 'auto');
    expect(source.getActiveBypassCount()).toBe(1);

    source.recordSpawn('session-b', 'auto');
    expect(source.getActiveBypassCount()).toBe(2);

    source.recordSpawn('session-c', 'ask');
    expect(source.getActiveBypassCount()).toBe(2);

    source.recordSpawn('session-d', 'ask');
    expect(source.getActiveBypassCount()).toBe(2);
  });

  it('Condition (4): re-recording same name replaces entry (no double-count)', async () => {
    const mod = await import('../../../src/main/bypass-perms-source.js');
    const createBypassPermsSource = (
      mod as {
        createBypassPermsSource: () => {
          recordSpawn(name: string, mode: 'auto' | 'ask'): void;
          getActiveBypassCount(): number;
        };
      }
    ).createBypassPermsSource;

    const source = createBypassPermsSource();
    source.recordSpawn('alpha', 'auto');
    source.recordSpawn('alpha', 'auto'); // same name, same mode
    expect(source.getActiveBypassCount()).toBe(1);

    source.recordSpawn('alpha', 'ask'); // mode flip
    expect(source.getActiveBypassCount()).toBe(0);

    source.recordSpawn('alpha', 'auto'); // back to auto
    expect(source.getActiveBypassCount()).toBe(1);
  });

  it('Condition (5): onUpdate fires on each recordSpawn; dispose deregisters', async () => {
    const mod = await import('../../../src/main/bypass-perms-source.js');
    const createBypassPermsSource = (
      mod as {
        createBypassPermsSource: () => {
          recordSpawn(name: string, mode: 'auto' | 'ask'): void;
          getActiveBypassCount(): number;
          onUpdate(cb: (count: number) => void): () => void;
        };
      }
    ).createBypassPermsSource;

    const source = createBypassPermsSource();
    const observed: number[] = [];
    const dispose = source.onUpdate((count) => observed.push(count));

    source.recordSpawn('s1', 'auto'); // count → 1
    source.recordSpawn('s2', 'ask'); // count → 1 (still)
    source.recordSpawn('s3', 'auto'); // count → 2
    expect(observed).toEqual([1, 1, 2]);

    dispose();
    source.recordSpawn('s4', 'auto'); // count → 3 but observer disposed
    expect(observed).toEqual([1, 1, 2]);
    // Aggregator state still advances:
    expect(source.getActiveBypassCount()).toBe(3);
  });

  it('Condition (6): getActiveBypassCount is deterministic (no hidden state churn)', async () => {
    const mod = await import('../../../src/main/bypass-perms-source.js');
    const createBypassPermsSource = (
      mod as {
        createBypassPermsSource: () => {
          recordSpawn(name: string, mode: 'auto' | 'ask'): void;
          getActiveBypassCount(): number;
        };
      }
    ).createBypassPermsSource;

    const source = createBypassPermsSource();
    source.recordSpawn('x', 'auto');
    source.recordSpawn('y', 'auto');
    source.recordSpawn('z', 'ask');

    const reads = Array.from({ length: 10 }, () =>
      source.getActiveBypassCount(),
    );
    expect(new Set(reads).size).toBe(1);
    expect(reads[0]).toBe(2);
  });
});
