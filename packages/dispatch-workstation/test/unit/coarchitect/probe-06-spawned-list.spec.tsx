// @vitest-environment happy-dom
//
// MB-T21 WB1 (red) — SpawnedList + parseSpawnedMarker contract tests.
// Operator-acked Q-MBT21-3=b (sentinel-marker parse for spawned: [...]).
//
// Contract asserted:
//   - SpawnedList:
//       * sessions=undefined or [] → renders nothing
//       * sessions=["sess-a","sess-b"] → renders <ul data-testid="spawned-list"
//         role="list"> containing <li data-testid="spawned-session-${idx}"
//         role="listitem"> with session-name text
//   - parseSpawnedMarker:
//       * Plain text → { stripped: <input>, sessions: null }
//       * Trailing 'spawned: ["a","b"]' line → strips line, sessions = ["a","b"]
//       * Empty array → sessions: null (no inline render warranted)
//
// WB1 red: skeleton returns null + parse passes through → all "with sessions"
// + "parsed marker" assertions fail.
// WB4 green: implementation lands ul/li render + regex parse.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpawnedList } from '../../../src/coarchitect/spawned-list.js';
import { parseSpawnedMarker } from '../../../src/coarchitect/chat-content-markers.js';

describe('MB-T21 WB1 — SpawnedList render', () => {
  it('renders nothing when sessions is undefined', () => {
    const { container } = render(<SpawnedList />);
    expect(container.querySelector('[data-testid="spawned-list"]')).toBeNull();
  });

  it('renders nothing when sessions is empty array', () => {
    const { container } = render(<SpawnedList sessions={[]} />);
    expect(container.querySelector('[data-testid="spawned-list"]')).toBeNull();
  });

  it('renders spawned-list ul with role=list when sessions provided', () => {
    render(<SpawnedList sessions={['sess-alpha', 'sess-beta']} />);
    const list = screen.getByTestId('spawned-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('role', 'list');
    expect(list.tagName.toLowerCase()).toBe('ul');
  });

  it('renders one li per session with role=listitem + indexed testid', () => {
    render(<SpawnedList sessions={['sess-a', 'sess-b', 'sess-c']} />);
    const a = screen.getByTestId('spawned-session-0');
    const b = screen.getByTestId('spawned-session-1');
    const c = screen.getByTestId('spawned-session-2');
    expect(a.tagName.toLowerCase()).toBe('li');
    expect(a).toHaveAttribute('role', 'listitem');
    expect(a).toHaveTextContent('sess-a');
    expect(b).toHaveTextContent('sess-b');
    expect(c).toHaveTextContent('sess-c');
  });
});

describe('MB-T21 WB1 — parseSpawnedMarker', () => {
  it('returns null sessions for content with no spawned: marker', () => {
    const content = 'no marker present in this assistant message';
    const result = parseSpawnedMarker(content);
    expect(result.sessions).toBeNull();
    expect(result.stripped).toBe(content);
  });

  it('parses trailing spawned: marker into sessions + strips marker line', () => {
    const content = 'Spawned 2 sessions for the parallel-cairn run.\n\nspawned: ["sess-a", "sess-b"]';
    const result = parseSpawnedMarker(content);
    expect(result.sessions).toEqual(['sess-a', 'sess-b']);
    expect(result.stripped).toBe('Spawned 2 sessions for the parallel-cairn run.');
  });

  it('returns null sessions for empty array marker (no inline render warranted)', () => {
    const content = 'msg\n\nspawned: []';
    const result = parseSpawnedMarker(content);
    expect(result.sessions).toBeNull();
  });

  it('strips trailing whitespace from stripped content', () => {
    const content = 'body  \n\n  spawned: ["x"]';
    const result = parseSpawnedMarker(content);
    expect(result.sessions).toEqual(['x']);
    expect(result.stripped).toBe('body');
  });
});
