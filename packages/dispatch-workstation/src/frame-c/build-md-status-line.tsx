// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB6 GREEN ·
// build-md-status-line.tsx — wireframe §1 bottom-status-line component.
//
// Per dispatch §1 wireframe-inventory verbatim:
//   "Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready.
//    Spawning K sessions now, max-parallel."
//
// Sub-Q-MBTWFT5-B=(ii) operator-arbitrated 2026-05-12: dispatch trigger
// is operator-click button (Spawn K sessions); auto-on-load deferred.
// Sub-Q-MBTWFT5-E=(i) operator-arbitrated 2026-05-12: status-line lives
// at Frame-C-bottom (this file); window-bottom relocation deferred until
// T4 bottom-rail surface ships (`MB-F-T5-STATUS-LINE-WINDOW-BOTTOM-
// RELOCATION` Tier 3 to be filed at WB12).
//
// Error states honest per ticket body §1.1:
// - NotFound: "No BUILD.md at <path>" placeholder
// - ParseError: parseErrors[] code/message breakdown inline
// - NotAFile / IoError: bare message rendering

import * as React from 'react';
import type { BuildMdLoadResult } from '../build-md/types.js';

export interface BuildMdStatusLineProps {
  readonly result: BuildMdLoadResult;
  readonly onSpawnTriggerClick?: () => void;
}

export function BuildMdStatusLine(props: BuildMdStatusLineProps): React.JSX.Element {
  const { result, onSpawnTriggerClick } = props;

  if (!result.ok) {
    return renderError(result);
  }

  const { status, revSha } = result;
  const revPart = revSha ? `(rev ${revSha}) ` : '';

  return (
    <div data-testid="build-md-status-line" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
      <span>
        Loaded BUILD.md {revPart}— parsed{' '}
        <span data-testid="build-md-task-count">{status.taskCount}</span>{' '}
        tasks,{' '}
        <span data-testid="build-md-blocked-count">{status.blockedCount}</span>{' '}
        blocked,{' '}
        <span data-testid="build-md-ready-count">{status.readyCount}</span>{' '}
        ready.
      </span>
      {status.readyCount > 0 ? (
        <button
          data-testid="build-md-spawn-trigger"
          onClick={onSpawnTriggerClick}
          type="button"
          style={{ padding: '4px 12px', cursor: 'pointer' }}
        >
          Spawn {status.readyCount} session{status.readyCount === 1 ? '' : 's'}
        </button>
      ) : null}
    </div>
  );
}

function renderError(result: Extract<BuildMdLoadResult, { ok: false }>): React.JSX.Element {
  if (result.error_type === 'ParseError' && result.parseErrors !== undefined) {
    return (
      <div data-testid="build-md-load-error" style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#c00' }}>
        <div>BUILD.md parse failed:</div>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          {result.parseErrors.map((err, idx) => (
            <li key={idx}>
              <code>{err.code}</code> (line {err.line}): {err.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div data-testid="build-md-load-error" style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#888' }}>
      {result.message}
    </div>
  );
}
