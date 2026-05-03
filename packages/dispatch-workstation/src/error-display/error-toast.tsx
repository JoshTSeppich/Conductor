// MB-T08 Cluster 3 GREEN — ErrorToast React component.
//
// Renders a WorkstationDisplayError (the union normalized by error-mappings.ts)
// with a friendly title, expandable technical details, dismiss button, optional
// retry button, and a copy-to-clipboard button for full-envelope debug paste.
//
// Visual style follows existing dispatch-workstation conventions (dark
// background, simple text — matches workstation-shell.html chrome). No
// dependency on a CSS framework; inline-style props keep the toast portable
// to whichever surface mounts it (spawn-modal-adjacent, console panel, chat).
import { useState, type CSSProperties } from 'react';
import { friendlyTitle, type WorkstationDisplayError } from './error-mappings.js';

export interface ErrorToastProps {
  error: WorkstationDisplayError;
  onDismiss: () => void;
  /** When provided, renders a Retry button that fires this callback. */
  onRetry?: () => void;
}

const ROOT_STYLE: CSSProperties = {
  position: 'relative',
  background: '#3a1f1f',
  border: '1px solid #6a2a2a',
  borderRadius: 6,
  color: '#f0e0e0',
  padding: '12px 16px',
  fontSize: 13,
  lineHeight: 1.4,
  maxWidth: 520,
};

const TITLE_STYLE: CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 6,
};

const BUTTON_ROW_STYLE: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 10,
};

const BUTTON_STYLE: CSSProperties = {
  background: '#4a2a2a',
  border: '1px solid #6a3a3a',
  color: '#f0e0e0',
  padding: '4px 10px',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};

const DETAILS_STYLE: CSSProperties = {
  marginTop: 6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  fontSize: 11,
  background: 'rgba(0,0,0,0.25)',
  padding: '6px 8px',
  borderRadius: 4,
};

function envelopeAsText(error: WorkstationDisplayError): string {
  return JSON.stringify(error, null, 2);
}

function detailsText(error: WorkstationDisplayError): string {
  const parts: string[] = [`type: ${error.type}`, `message: ${error.message}`];
  if ('sessionName' in error && error.sessionName) {
    parts.push(`sessionName: ${error.sessionName}`);
  }
  if ('cap' in error && typeof error.cap === 'number') {
    parts.push(`cap: ${error.cap}`);
  }
  if ('stderr' in error && error.stderr) {
    parts.push(`stderr: ${error.stderr}`);
  }
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    parts.push(`statusCode: ${error.statusCode}`);
  }
  return parts.join('\n');
}

export function ErrorToast({ error, onDismiss, onRetry }: ErrorToastProps): JSX.Element {
  const [expanded, setExpanded] = useState(true);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(envelopeAsText(error));
    } catch {
      // Clipboard may be unavailable (older Electron, headless test) — silent
      // fallback is acceptable; operator can still read details inline.
    }
  }

  return (
    <div data-testid="error-toast-root" role="alert" style={ROOT_STYLE}>
      <div data-testid="error-toast-title" style={TITLE_STYLE}>
        {friendlyTitle(error)}
      </div>
      <div>{error.message}</div>

      {expanded && (
        <pre data-testid="error-toast-details" style={DETAILS_STYLE}>
          {detailsText(error)}
        </pre>
      )}

      <div style={BUTTON_ROW_STYLE}>
        <button
          data-testid="error-toast-toggle-details"
          style={BUTTON_STYLE}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
        <button
          data-testid="error-toast-copy"
          style={BUTTON_STYLE}
          onClick={() => {
            void handleCopy();
          }}
        >
          Copy
        </button>
        {onRetry && (
          <button
            data-testid="error-toast-retry"
            style={BUTTON_STYLE}
            onClick={onRetry}
          >
            Retry
          </button>
        )}
        <button
          data-testid="error-toast-dismiss"
          style={BUTTON_STYLE}
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
