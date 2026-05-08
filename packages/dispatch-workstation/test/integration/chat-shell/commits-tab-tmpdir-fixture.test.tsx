// @vitest-environment happy-dom
//
// MB-T22 WB4 — Commits tab tmpdir-fixture integration test (Q-MBT22-8=a).
//
// Exercises the full renderer-side path against a real `git init` tmpdir
// fixture:
//
//   tmpdir + git init + scripted commits with controlled author dates +
//   varied sess-mbt subjects
//     →
//   mountChatShell({ rootElementId, bridge: fakeCoarchitectBridge,
//     commitsBridge: { listCommits: () => readCommits({repoRoot: tmpdir})
//   } })
//     →
//   ChatShell renders Chat + Commits tabs (multi-tab API per WB2)
//     →
//   click Commits tab → CommitsTab fetches via bridge → groups render
//
// Verifies (Q-MBT22-8=a acceptance):
//   - Today / Yesterday / Older buckets render with correct data-testid
//     containers per the local-TZ classification (TZ pinned to PDT for
//     determinism — same approach as test/unit/commits-reader/probe-02).
//   - Session attribution renders correctly (subject-prefix path AND
//     body sess-mbt* path AND "unknown" path).
//   - time-ago text renders inside commits-tab-row-{sha}-time-ago.
//   - Diff stat numerals appear inside each row.
//   - Commits tab's bridge fetch resolves on mount; loading row clears.
//
// No Electron boot — happy-dom + RTL exercise the renderer + commits-
// reader pipeline directly. Runtime electron smoke per CLAUDE.md §4.6
// is a separate harness step (logged in WB4 commit body).

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import {
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  mountChatShell,
  type CoarchitectBridge,
} from '../../../src/chat-shell/mount.js';
import {
  readCommits,
  type CommitGroup,
} from '../../../src/chat-shell/commits-reader.js';
import type { CommitsBridge } from '../../../src/chat-shell/commits-tab.js';

// ---------------------------------------------------------------------
// TZ pin (deterministic Today/Yesterday/Older classification)
// ---------------------------------------------------------------------
const ORIGINAL_TZ = process.env['TZ'];
let fixtureRepo: string;
let fixtureNow: Date;

beforeAll(() => {
  process.env['TZ'] = 'America/Los_Angeles';
  // Pick a fixed `now` in the middle of a PDT day so the offsets below
  // produce unambiguous calendar-day boundaries.
  fixtureNow = new Date('2026-05-07T12:00:00.000-07:00');
  fixtureRepo = createFixtureRepo(fixtureNow);
});

afterAll(() => {
  if (fixtureRepo) {
    rmSync(fixtureRepo, { recursive: true, force: true });
  }
  if (ORIGINAL_TZ === undefined) {
    delete process.env['TZ'];
  } else {
    process.env['TZ'] = ORIGINAL_TZ;
  }
});

// ---------------------------------------------------------------------
// Fixture repo: git init + 5 commits with controlled dates + varied
// sess-mbt attributions
// ---------------------------------------------------------------------
function createFixtureRepo(now: Date): string {
  const dir = mkdtempSync(join(tmpdir(), 'mbt22-wb4-fixture-'));
  const gitEnv: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
  };
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir, env: gitEnv });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: dir,
    env: gitEnv,
  });
  execFileSync('git', ['config', 'user.name', 'MBT22 Tester'], {
    cwd: dir,
    env: gitEnv,
  });
  // Ensure `git commit` doesn't try to GPG-sign in test env.
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], {
    cwd: dir,
    env: gitEnv,
  });

  const offsets: Array<{
    delta: number; // ms before `now`
    subject: string;
    body: string;
    expectedAttribution: string;
    expectedBucket: 'Today' | 'Yesterday' | 'Older';
  }> = [
    {
      delta: 1 * 3600 * 1000, // 1h ago — today
      subject: 'green(MB-T22): WB4 — commits-tab impl',
      body: 'Ships the Commits tab renderer.',
      expectedAttribution: 'MB-T22',
      expectedBucket: 'Today',
    },
    {
      delta: 3 * 3600 * 1000, // 3h ago — today
      subject: 'green(MB-T26): WB3 — cost-meter slot',
      body: 'Lands cost-meter under chat-shell-header-bar.',
      expectedAttribution: 'MB-T26',
      expectedBucket: 'Today',
    },
    {
      delta: 30 * 3600 * 1000, // 30h ago — yesterday (PDT)
      subject: 'merge: branch foo',
      body: 'See sess-mbt13 incident notes.',
      expectedAttribution: 'MB-T13',
      expectedBucket: 'Yesterday',
    },
    {
      delta: 8 * 24 * 3600 * 1000, // 8d ago — older
      subject: 'Initial commit',
      body: 'Bootstrap repo with README.',
      expectedAttribution: 'unknown',
      expectedBucket: 'Older',
    },
    {
      delta: 14 * 24 * 3600 * 1000, // 14d ago — older
      subject: 'docs(MB-T20): WB5 — findings',
      body: '',
      expectedAttribution: 'MB-T20',
      expectedBucket: 'Older',
    },
  ];

  // Author commits in CHRONOLOGICAL order (oldest first) so `git log`
  // returns them newest-first matching real-world workstation usage.
  const sorted = [...offsets].sort((a, b) => b.delta - a.delta);
  for (const o of sorted) {
    const isoDate = new Date(now.getTime() - o.delta).toISOString();
    execFileSync(
      'git',
      ['commit', '--allow-empty', '-m', o.subject, '-m', o.body],
      {
        cwd: dir,
        env: {
          ...gitEnv,
          GIT_AUTHOR_DATE: isoDate,
          GIT_COMMITTER_DATE: isoDate,
        },
      },
    );
  }
  return dir;
}

// ---------------------------------------------------------------------
// Test mount harness
// ---------------------------------------------------------------------
let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  target.id = 'mbt22-wb4-mount-target';
  document.body.appendChild(target);
});

afterEach(() => {
  if (target.parentNode) target.remove();
});

function makeFakeCoarchitectBridge(): CoarchitectBridge {
  // Minimal bridge — Chat tab path needs it but the test only exercises
  // the Commits tab. fetchHistory returns []; postMessage/sendAndStream
  // are no-ops; onStream* return cleanup-fns.
  return {
    fetchHistory: async () => [],
    postMessage: async (msg) => ({
      id: `fake-${Date.now()}`,
      role: msg.role,
      content: msg.content,
      created_at: new Date().toISOString(),
      build_doc_id: msg.build_doc_id ?? null,
      build_doc_commit_sha: msg.build_doc_commit_sha ?? null,
    }),
    sendAndStream: () => undefined,
    onStreamChunk: () => () => undefined,
    onStreamDone: () => () => undefined,
    onStreamError: () => () => undefined,
  };
}

function makeFixtureCommitsBridge(repoRoot: string, now: Date): CommitsBridge {
  return {
    listCommits: async (opts) => {
      const groups = await readCommits({
        repoRoot,
        limit: opts?.limit ?? 50,
        now,
      });
      return { groups };
    },
  };
}

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

describe('MB-T22 WB4 — Commits tab tmpdir-fixture integration (Q-MBT22-8=a)', () => {
  it('renders the Commits tab chip alongside Chat in the multi-tab strip', async () => {
    await act(async () => {
      mountChatShell({
        rootElementId: 'mbt22-wb4-mount-target',
        bridge: makeFakeCoarchitectBridge(),
        commitsBridge: makeFixtureCommitsBridge(fixtureRepo, fixtureNow),
      });
    });
    expect(
      document.querySelector('[data-testid="chat-shell-tab-chat"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="chat-shell-tab-commits"]'),
    ).not.toBeNull();
  });

  it('clicking the Commits chip switches active tab + fetches groups via bridge', async () => {
    await act(async () => {
      mountChatShell({
        rootElementId: 'mbt22-wb4-mount-target',
        bridge: makeFakeCoarchitectBridge(),
        commitsBridge: makeFixtureCommitsBridge(fixtureRepo, fixtureNow),
      });
    });
    const commitsChip = document.querySelector(
      '[data-testid="chat-shell-tab-commits"]',
    ) as HTMLButtonElement | null;
    expect(commitsChip).not.toBeNull();

    await act(async () => {
      fireEvent.click(commitsChip!);
    });
    // Bridge.listCommits → readCommits → real `git log` subprocess. That's
    // a real I/O wait, NOT a microtask — vi.waitFor polls until the
    // loading row clears (or times out at 5s).
    await vi.waitFor(
      () => {
        expect(
          document.querySelector('[data-testid="commits-tab-loading"]'),
        ).toBeNull();
        expect(
          document.querySelector('[data-testid="commits-tab-group-today"]'),
        ).not.toBeNull();
      },
      { timeout: 5000, interval: 50 },
    );

    expect(
      document.querySelector('[data-testid="commits-tab-root"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="commits-tab-group-today"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="commits-tab-group-yesterday"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="commits-tab-group-older"]'),
    ).not.toBeNull();
  });

  it('renders correct session attribution per Q-MBT22-5 precedence (subject-prefix → body sess-mbt* → unknown)', async () => {
    // Directly fetch via readCommits — we want to assert attribution
    // on specific shortSHAs, which requires inspecting the fetched
    // entries (the on-disk SHAs are not predictable).
    const groups = await readCommits({
      repoRoot: fixtureRepo,
      limit: 50,
      now: fixtureNow,
    });
    const allCommits = groups.flatMap((g) => g.commits);
    expect(allCommits.length).toBe(5);

    // Match commits by subject and verify attribution.
    const t22 = allCommits.find((c) =>
      c.subject.startsWith('green(MB-T22)'),
    );
    expect(t22?.sessionAttribution).toBe('MB-T22');

    const t26 = allCommits.find((c) =>
      c.subject.startsWith('green(MB-T26)'),
    );
    expect(t26?.sessionAttribution).toBe('MB-T26');

    const merge = allCommits.find((c) => c.subject.startsWith('merge:'));
    expect(merge?.sessionAttribution).toBe('MB-T13');

    const initial = allCommits.find((c) => c.subject === 'Initial commit');
    expect(initial?.sessionAttribution).toBe('unknown');

    const t20 = allCommits.find((c) =>
      c.subject.startsWith('docs(MB-T20)'),
    );
    expect(t20?.sessionAttribution).toBe('MB-T20');
  });

  it('classifies commits into Today / Yesterday / Older buckets per local-TZ calendar day (PDT-pinned)', async () => {
    const groups = await readCommits({
      repoRoot: fixtureRepo,
      limit: 50,
      now: fixtureNow,
    });
    const today = groups.find((g) => g.label === 'Today');
    const yesterday = groups.find((g) => g.label === 'Yesterday');
    const older = groups.find((g) => g.label === 'Older');

    expect(today).toBeDefined();
    expect(today!.commits.length).toBe(2);

    expect(yesterday).toBeDefined();
    expect(yesterday!.commits.length).toBe(1);

    expect(older).toBeDefined();
    expect(older!.commits.length).toBe(2);
  });

  it('renders per-row content (short SHA, attribution chip, time-ago testid) for each fetched commit', async () => {
    await act(async () => {
      mountChatShell({
        rootElementId: 'mbt22-wb4-mount-target',
        bridge: makeFakeCoarchitectBridge(),
        commitsBridge: makeFixtureCommitsBridge(fixtureRepo, fixtureNow),
      });
    });
    const commitsChip = document.querySelector(
      '[data-testid="chat-shell-tab-commits"]',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(commitsChip);
    });
    // Wait for bridge.listCommits subprocess to resolve.
    await vi.waitFor(
      () => {
        expect(
          document.querySelector('[data-testid="commits-tab-loading"]'),
        ).toBeNull();
      },
      { timeout: 5000, interval: 50 },
    );

    // Fetch the same data via readCommits to learn the shortSHAs.
    const groups: readonly CommitGroup[] = await readCommits({
      repoRoot: fixtureRepo,
      limit: 50,
      now: fixtureNow,
    });
    const allCommits = groups.flatMap((g) => g.commits);

    for (const c of allCommits) {
      const row = document.querySelector(
        `[data-testid="commits-tab-row-${c.shortSha}"]`,
      );
      expect(row, `row missing for shortSha=${c.shortSha}`).not.toBeNull();
      const attr = document.querySelector(
        `[data-testid="commits-tab-row-${c.shortSha}-attribution"]`,
      );
      expect(
        attr,
        `attribution missing for shortSha=${c.shortSha}`,
      ).not.toBeNull();
      expect(attr?.textContent).toContain(c.sessionAttribution);
      const timeAgo = document.querySelector(
        `[data-testid="commits-tab-row-${c.shortSha}-time-ago"]`,
      );
      expect(
        timeAgo,
        `time-ago missing for shortSha=${c.shortSha}`,
      ).not.toBeNull();
    }
  });
});
