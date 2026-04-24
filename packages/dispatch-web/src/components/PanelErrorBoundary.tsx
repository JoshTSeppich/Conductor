import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export interface PanelErrorBoundaryProps {
  /** Used in the fallback text: "{name} failed to render — reload?". */
  name: string;
  children: ReactNode;
}

// Defense-in-depth layer 2 (TICKETS.md component hierarchy):
//   layer 1 = top-level <App> ErrorBoundary (WEB-T01)
//   layer 2 = per-panel boundary (this file, WEB-T06)
//   layer 3 = inner panel content (W-3+ panels — kanban cards,
//             focused-detail subviews, ticker rows)
// An error in any one panel renders panel-scoped fallback while
// sibling panels continue to render normally.
export function PanelErrorBoundary({
  name,
  children,
}: PanelErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      FallbackComponent={({ resetErrorBoundary }) => (
        <div
          role="alert"
          style={{
            padding: 12,
            fontFamily: 'system-ui',
            color: '#b00',
          }}
        >
          <p style={{ margin: '0 0 8px' }}>
            {name} failed to render — reload?
          </p>
          <button onClick={resetErrorBoundary} type="button">
            Reload
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
