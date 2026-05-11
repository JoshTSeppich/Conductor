// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB8 (green) — DetailPane: renders
// the swarm-state.md section for the currently-selected session.
//
// Per ticket body a1f7a03 §4 WB8 + Sub-Q-MBTWBFCS-B=i operator-pre-
// arbitrated 2026-05-11:
//   - Mounted by FrameCRoot ONLY when `selectedSessionName !== null`
//     (render-gating; Condition (a) of WB7 probe-mbtwbfcs-04).
//   - On selection-change, queries `window.workstationBridge.readSwarmState()`
//     to fetch full swarm-state.md content. Bridge wired at preload.mts
//     extension + main.ts `workstation:read-swarm-state` IPC handler
//     (WB8 GREEN; WORKSTATION_CONTRACT.md §6 amendment territory per
//     CLAUDE.md §2.4 → HALT-WB8-PRE-COMMIT operator review).
//   - Parses per-session sections from returned markdown text. The
//     parser looks for lines matching `- sessionName: <name>` /
//     `sessionName: <name>` / `peer_session: <name>` (canonical
//     swarm-state.md emission patterns per swarm-state-writer.ts:252/
//     313); captures from match until the next session-marker line.
//   - Renders `data-testid="frame-c-detail-pane"` with the extracted
//     section text in a <pre>-formatted block. Empty/no-match state
//     surfaces honest "no swarm-state section found" placeholder.
//
// Lifecycle:
//   - useEffect on `selectedSessionName` change → re-invokes the bridge
//     + re-parses. Cancellation via local `cancelled` flag prevents
//     state updates after unmount or rapid selection-changes (avoids
//     React's "set state on unmounted component" warning).
//   - Errors (bridge missing OR read failure) surface as inline error
//     text; do not crash the parent. ENOENT (swarm-state.md not yet
//     written by HSO) returns empty string from IPC → parser surfaces
//     "no swarm-state section found" placeholder honestly.

import { useEffect, useState, type CSSProperties } from 'react';

const DETAIL_PANE_STYLE: CSSProperties = {
  padding: '12px',
  fontFamily: 'monospace',
  fontSize: '13px',
  height: '100%',
  overflowY: 'auto',
  boxSizing: 'border-box',
  color: '#dddddd',
};

const HEADER_STYLE: CSSProperties = {
  fontSize: '12px',
  color: '#888888',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const PRE_STYLE: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  lineHeight: 1.4,
};

const ERROR_STYLE: CSSProperties = {
  color: '#ff8888',
};

export interface DetailPaneProps {
  /**
   * The currently-selected session's name. FrameCRoot gates the render
   * on `selected !== null`; this component assumes a valid session name.
   */
  readonly selectedSessionName: string;
}

interface WorkstationBridgeShape {
  readSwarmState?: () => Promise<string>;
}

interface WindowWithBridge {
  workstationBridge?: WorkstationBridgeShape;
}

/**
 * Extracts the section of swarm-state.md text corresponding to the
 * given session name. A "section" starts at a line whose trimmed form
 * starts with one of:
 *   - `- sessionName: <name>`
 *   - `sessionName: <name>`
 *   - `peer_session: <name>`
 * and continues until the next line matching ANY session-marker
 * (regardless of name) or end-of-document.
 *
 * Multiple matches for the same name are concatenated with a `---`
 * separator. No-match returns the empty string (caller surfaces
 * placeholder copy).
 */
export function extractSwarmStateSection(text: string, sessionName: string): string {
  const lines = text.split('\n');
  const matchesTarget = (line: string): boolean => {
    const t = line.trim();
    return (
      t.startsWith(`- sessionName: ${sessionName}`) ||
      t.startsWith(`sessionName: ${sessionName}`) ||
      t.startsWith(`peer_session: ${sessionName}`)
    );
  };
  const isAnySessionStart = (line: string): boolean => {
    const t = line.trim();
    return (
      /^- sessionName:\s/.test(t) ||
      /^sessionName:\s/.test(t) ||
      /^peer_session:\s/.test(t)
    );
  };

  const sections: string[] = [];
  let inSection = false;
  let buf: string[] = [];

  for (const line of lines) {
    if (matchesTarget(line)) {
      if (inSection && buf.length > 0) {
        sections.push(buf.join('\n'));
      }
      buf = [line];
      inSection = true;
    } else if (inSection) {
      if (isAnySessionStart(line)) {
        sections.push(buf.join('\n'));
        buf = [];
        inSection = false;
      } else {
        buf.push(line);
      }
    }
  }
  if (inSection && buf.length > 0) {
    sections.push(buf.join('\n'));
  }

  return sections.join('\n\n---\n\n');
}

export function DetailPane(props: DetailPaneProps): JSX.Element {
  const { selectedSessionName } = props;
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.workstationBridge;
    if (!bridge?.readSwarmState) {
      setError('workstationBridge.readSwarmState unavailable');
      setContent('');
      return;
    }
    void bridge
      .readSwarmState()
      .then((text: string) => {
        if (cancelled) return;
        const section = extractSwarmStateSection(text, selectedSessionName);
        setContent(section);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(String(e));
        setContent('');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionName]);

  const body = error
    ? `Error reading swarm-state: ${error}`
    : content.length > 0
      ? content
      : `No swarm-state section found for session "${selectedSessionName}".`;

  return (
    <div data-testid="frame-c-detail-pane" style={DETAIL_PANE_STYLE}>
      <div style={HEADER_STYLE}>{selectedSessionName}</div>
      <pre style={error ? { ...PRE_STYLE, ...ERROR_STYLE } : PRE_STYLE}>
        {body}
      </pre>
    </div>
  );
}
