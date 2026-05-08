// @vitest-environment happy-dom
//
// MB-T22 WB1 RED — CommitsTab render probe.
//
// Operator-confirmed dispositions (decisions doc 2026-05-07):
//   Q-MBT22-2=a — co-located at src/chat-shell/commits-tab.tsx
//   Q-MBT22-6=a — component-local useEffect + setInterval(60_000)
//   Q-MBT22-7=a — window.commitsBridge supplies the data path at WB4;
//                 this probe seeds via the `groups` prop (test affordance)
//
// All assertions fail RED at WB1 because CommitsTab throws at render.
// WB4 green ships the real component.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommitsTab } from '../../../src/chat-shell/commits-tab.js';
import type {
  CommitEntry,
  CommitGroup,
} from '../../../src/chat-shell/commits-reader.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function commit(overrides: Partial<CommitEntry>): CommitEntry {
  return {
    sha: 'a'.repeat(40),
    shortSha: 'a'.repeat(7),
    subject: 'placeholder subject',
    body: '',
    author: 'Tester',
    authoredAt: '2026-05-07T09:30:00.000-07:00',
    filesChanged: 1,
    insertions: 1,
    deletions: 0,
    sessionAttribution: 'unknown',
    ...overrides,
  };
}

const fixtureGroups: readonly CommitGroup[] = [
  {
    label: 'Today',
    commits: [
      commit({
        sha: 'a'.repeat(40),
        shortSha: 'aaaaaaa',
        subject: 'green(MB-T22): WB2 — multi-tab',
        sessionAttribution: 'MB-T22',
        authoredAt: '2026-05-07T09:30:00.000-07:00', // 2.5h before now
        filesChanged: 2,
        insertions: 50,
        deletions: 5,
      }),
    ],
  },
  {
    label: 'Yesterday',
    commits: [
      commit({
        sha: 'b'.repeat(40),
        shortSha: 'bbbbbbb',
        subject: 'docs(MB-T20): WB5 — findings',
        sessionAttribution: 'MB-T20',
        authoredAt: '2026-05-06T18:30:00.000-07:00',
        filesChanged: 1,
        insertions: 200,
        deletions: 0,
      }),
    ],
  },
  {
    label: 'Older',
    commits: [
      commit({
        sha: 'c'.repeat(40),
        shortSha: 'ccccccc',
        subject: 'merge: branch foo',
        body: 'See sess-mbt09 incident notes.',
        sessionAttribution: 'MB-T09',
        authoredAt: '2026-04-29T12:00:00.000-07:00',
        filesChanged: 3,
        insertions: 10,
        deletions: 8,
      }),
    ],
  },
];

const NOW = new Date('2026-05-07T12:00:00.000-07:00');

// ---------------------------------------------------------------------------
// Render contract
// ---------------------------------------------------------------------------

describe('MB-T22 WB1 RED — CommitsTab render contract', () => {
  it('renders commits-tab-root container', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(screen.getByTestId('commits-tab-root')).toBeInTheDocument();
  });

  it('renders a per-group container for each non-empty bucket', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(screen.getByTestId('commits-tab-group-today')).toBeInTheDocument();
    expect(
      screen.getByTestId('commits-tab-group-yesterday'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('commits-tab-group-older')).toBeInTheDocument();
  });

  it('renders Today / Yesterday / Older group headings as visible text', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Older')).toBeInTheDocument();
  });

  it('omits a group container when its bucket is absent', () => {
    const onlyToday: readonly CommitGroup[] = [fixtureGroups[0]!];
    render(<CommitsTab groups={onlyToday} now={NOW} />);
    expect(screen.getByTestId('commits-tab-group-today')).toBeInTheDocument();
    expect(
      screen.queryByTestId('commits-tab-group-yesterday'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('commits-tab-group-older'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Per-row content
// ---------------------------------------------------------------------------

describe('MB-T22 WB1 RED — CommitsTab per-row content', () => {
  it('renders one row per commit with commits-tab-row-{shortSha} testid', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(screen.getByTestId('commits-tab-row-aaaaaaa')).toBeInTheDocument();
    expect(screen.getByTestId('commits-tab-row-bbbbbbb')).toBeInTheDocument();
    expect(screen.getByTestId('commits-tab-row-ccccccc')).toBeInTheDocument();
  });

  it('renders the short SHA as visible text in each row', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(screen.getByText('aaaaaaa')).toBeInTheDocument();
    expect(screen.getByText('bbbbbbb')).toBeInTheDocument();
    expect(screen.getByText('ccccccc')).toBeInTheDocument();
  });

  it('renders the commit subject in each row', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(
      screen.getByText('green(MB-T22): WB2 — multi-tab'),
    ).toBeInTheDocument();
    expect(screen.getByText('docs(MB-T20): WB5 — findings')).toBeInTheDocument();
    expect(screen.getByText('merge: branch foo')).toBeInTheDocument();
  });

  it('renders session attribution chip with commits-tab-row-{sha}-attribution testid', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    const t22 = screen.getByTestId('commits-tab-row-aaaaaaa-attribution');
    const t20 = screen.getByTestId('commits-tab-row-bbbbbbb-attribution');
    const t09 = screen.getByTestId('commits-tab-row-ccccccc-attribution');
    expect(t22).toHaveTextContent('MB-T22');
    expect(t20).toHaveTextContent('MB-T20');
    expect(t09).toHaveTextContent('MB-T09');
  });

  it('renders diff stat (files / insertions / deletions) in each row', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    // Format is impl-detail (e.g. "+50 −5" or "2 files · +50 −5"); probe
    // asserts that the numeric values appear somewhere in the row.
    const row22 = screen.getByTestId('commits-tab-row-aaaaaaa');
    expect(row22.textContent ?? '').toMatch(/50/);
    expect(row22.textContent ?? '').toMatch(/5/);
  });

  it('renders time-ago text with commits-tab-row-{sha}-time-ago testid', () => {
    render(<CommitsTab groups={fixtureGroups} now={NOW} />);
    expect(
      screen.getByTestId('commits-tab-row-aaaaaaa-time-ago'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('commits-tab-row-bbbbbbb-time-ago'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('commits-tab-row-ccccccc-time-ago'),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty / loading / error states
// ---------------------------------------------------------------------------

describe('MB-T22 WB1 RED — CommitsTab empty/loading/error states', () => {
  it('renders commits-tab-empty row when groups is empty', () => {
    render(<CommitsTab groups={[]} now={NOW} />);
    expect(screen.getByTestId('commits-tab-empty')).toBeInTheDocument();
  });

  it('renders commits-tab-empty row when groups is undefined', () => {
    render(<CommitsTab now={NOW} />);
    expect(screen.getByTestId('commits-tab-empty')).toBeInTheDocument();
  });

  it('renders commits-tab-loading row when loading=true', () => {
    render(<CommitsTab loading={true} now={NOW} />);
    expect(screen.getByTestId('commits-tab-loading')).toBeInTheDocument();
  });

  it('renders commits-tab-error row when error is non-null', () => {
    render(<CommitsTab error="git not found" now={NOW} />);
    const err = screen.getByTestId('commits-tab-error');
    expect(err).toBeInTheDocument();
    expect(err).toHaveTextContent('git not found');
  });
});
