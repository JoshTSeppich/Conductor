// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB5 RED · MBTWFT5-03
//
// Probes the `BuildMdStatusLine` React component that renders the
// wireframe §1 bottom-status-line:
//   "Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready."
// per dispatch §1 wireframe-inventory verbatim.
//
// Per Sub-Q-MBTWFT5-B=(ii) operator-arbitrated 2026-05-12, the
// component also renders an operator-click "Spawn K sessions" trigger
// button with `data-testid="build-md-spawn-trigger"`.
//
// At WB5 RED time `src/frame-c/build-md-status-line.tsx` does not
// exist; vitest fails the suite at module-resolve. WB6 GREEN ships
// the component and flips RED → GREEN.

import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// @ts-expect-error — WB5 RED: import target absent until WB6 GREEN ships build-md-status-line.tsx.
import { BuildMdStatusLine } from '../../../src/frame-c/build-md-status-line.js';

import type { BuildMdLoadResult } from '../../../src/build-md/types.js';

afterEach(() => {
  cleanup();
});

// Hand-rolled BuildMdLoadResult fixtures matching parser output shape.
const SUCCESS_RESULT: BuildMdLoadResult = {
  ok: true,
  path: '/repo/BUILD.md',
  revSha: 'abc1234',
  dag: {
    preamble: { repo: 'foxworks-dispatch', planRev: '2026-05-12.A' },
    tasks: [
      {
        id: '1',
        title: 'First',
        goal: 'first goal',
        branch: 'feat/first',
        dependsOn: [],
        acceptance: ['acc 1'],
        sourceLine: 5,
      },
      {
        id: '2',
        title: 'Second',
        goal: 'second goal',
        branch: 'feat/second',
        dependsOn: ['1'],
        acceptance: ['acc 2'],
        sourceLine: 15,
      },
      {
        id: '3',
        title: 'Third',
        goal: 'third goal',
        branch: 'feat/third',
        dependsOn: [],
        acceptance: ['acc 3'],
        sourceLine: 25,
      },
    ],
    groups: [],
    edges: [{ from: '2', to: '1' }],
  },
  status: { taskCount: 3, blockedCount: 1, readyCount: 2, errorCount: 0 },
};

const NOT_FOUND_RESULT: BuildMdLoadResult = {
  ok: false,
  error_type: 'NotFound',
  message: 'No BUILD.md at /repo/BUILD.md',
};

const PARSE_ERROR_RESULT: BuildMdLoadResult = {
  ok: false,
  error_type: 'ParseError',
  message: 'BUILD.md parse failed (2 errors)',
  parseErrors: [
    { code: 'preamble.missing', message: 'Missing preamble', line: 1 },
    { code: 'task.malformed-heading', message: 'Bad heading', line: 5, details: { rawHeading: 'bad' } },
  ],
};

describe('MBTWFT5-03 BuildMdStatusLine renders wireframe §1 status line', () => {
  it('renders the wireframe template text with N/M/K substituted from status', () => {
    const { getByTestId } = render(<BuildMdStatusLine result={SUCCESS_RESULT} />);
    const line = getByTestId('build-md-status-line');
    expect(line.textContent).toContain('Loaded BUILD.md');
    expect(line.textContent).toContain('rev abc1234');
    expect(line.textContent).toContain('parsed 3 tasks');
    expect(line.textContent).toContain('1 blocked');
    expect(line.textContent).toContain('2 ready');
  });

  it('renders individual count testids for granular assertions', () => {
    const { getByTestId } = render(<BuildMdStatusLine result={SUCCESS_RESULT} />);
    expect(getByTestId('build-md-task-count').textContent).toBe('3');
    expect(getByTestId('build-md-blocked-count').textContent).toBe('1');
    expect(getByTestId('build-md-ready-count').textContent).toBe('2');
  });

  it('renders Spawn K sessions button when ready > 0 (Sub-Q-B=(ii))', () => {
    const { getByTestId } = render(<BuildMdStatusLine result={SUCCESS_RESULT} />);
    const button = getByTestId('build-md-spawn-trigger');
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain('Spawn');
    expect(button.textContent).toContain('2'); // ready count
  });

  it('hides Spawn button when readyCount === 0', () => {
    const idle: BuildMdLoadResult = {
      ...SUCCESS_RESULT,
      status: { taskCount: 0, blockedCount: 0, readyCount: 0, errorCount: 0 },
      dag: { ...SUCCESS_RESULT.dag, tasks: [], edges: [] },
    };
    const { queryByTestId } = render(<BuildMdStatusLine result={idle} />);
    expect(queryByTestId('build-md-spawn-trigger')).toBeNull();
  });

  it('renders empty-state placeholder when result is NotFound', () => {
    const { getByTestId } = render(<BuildMdStatusLine result={NOT_FOUND_RESULT} />);
    const errorEl = getByTestId('build-md-load-error');
    expect(errorEl.textContent).toContain('No BUILD.md');
    expect(errorEl.textContent).toContain('/repo/BUILD.md');
  });

  it('renders parse-error breakdown with parseErrors list when result is ParseError', () => {
    const { getByTestId } = render(<BuildMdStatusLine result={PARSE_ERROR_RESULT} />);
    const errorEl = getByTestId('build-md-load-error');
    expect(errorEl.textContent).toContain('parse failed');
    expect(errorEl.textContent).toContain('preamble.missing');
    expect(errorEl.textContent).toContain('task.malformed-heading');
  });

  it('invokes onSpawnTriggerClick when Spawn button clicked', () => {
    let clicked = 0;
    const { getByTestId } = render(
      <BuildMdStatusLine result={SUCCESS_RESULT} onSpawnTriggerClick={() => clicked++} />
    );
    (getByTestId('build-md-spawn-trigger') as HTMLButtonElement).click();
    expect(clicked).toBe(1);
  });
});
