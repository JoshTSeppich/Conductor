// CONSOLE-T03 Cluster 5 — Test 2/3: menu rebuilds when session list changes.
//
// Vision §10.10 ship-gate (implicit): the "CC Console > [session]" menu
// must reflect the operator-visible session list. Approach for v3.0:
// `buildConsoleMenu` is a pure function the caller invokes whenever the
// daemon's session list changes (the caller is `main.ts`, which subscribes
// to /v2/events/stream or polls /v2/sessions; that wiring is OUT of CONSOLE-T03
// scope and lands as a followup). This test asserts the build-fn's contract:
// different `sessions` → different menu items.
//
// RED state: src/main/console-menu.ts absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { buildConsoleMenu } from '../../../src/main/console-menu.js';

describe('CONSOLE-T03 cluster 5 — session list updates', () => {
  it('different session arrays produce different submenu item labels', () => {
    const before = buildConsoleMenu({
      sessions: ['alpha', 'beta'],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });
    const after = buildConsoleMenu({
      sessions: ['alpha', 'gamma', 'delta'],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });

    const labels = (m: typeof before): string[] =>
      (m.submenu as Array<{ label?: string; type?: string }>)
        .filter((i) => !i.type)
        .map((i) => i.label ?? '');

    expect(labels(before)).toEqual(['alpha', 'beta']);
    expect(labels(after)).toEqual(['alpha', 'gamma', 'delta']);
  });

  it('session removed from list disappears from submenu in next rebuild', () => {
    const before = buildConsoleMenu({
      sessions: ['alpha', 'beta', 'gamma'],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });
    const after = buildConsoleMenu({
      sessions: ['alpha', 'gamma'],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });

    const itemsAfter = (after.submenu as Array<{ label?: string }>).map(
      (i) => i.label ?? '',
    );
    expect(itemsAfter).not.toContain('beta');
    expect(itemsAfter).toContain('alpha');
    expect(itemsAfter).toContain('gamma');

    // Sanity: prior build is unaffected (pure-function contract).
    const itemsBefore = (before.submenu as Array<{ label?: string }>).map(
      (i) => i.label ?? '',
    );
    expect(itemsBefore).toContain('beta');
  });
});
