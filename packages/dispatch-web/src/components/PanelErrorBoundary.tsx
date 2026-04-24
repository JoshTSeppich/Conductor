import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export interface PanelErrorBoundaryProps {
  /** Used in the fallback text: "{name} failed to render — reload?". */
  name: string;
  children: ReactNode;
}

// Defense-in-depth layer 2 (TICKETS.md component hierarchy):
//   layer 1 = top-level <App> ErrorBoundary (WEB-T01)
//   layer 2 = per-panel boundary (this file, WEB-T06; styled T07)
//   layer 3 = inner panel content (W-3+ panels)
export function PanelErrorBoundary({
  name,
  children,
}: PanelErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      FallbackComponent={({ resetErrorBoundary }) => (
        <div
          role="alert"
          className="p-3 font-sans text-red-700 dark:text-red-300"
        >
          <p className="mb-2">{name} failed to render — reload?</p>
          <button
            onClick={resetErrorBoundary}
            type="button"
            className="px-2 py-1 border border-red-700 dark:border-red-300 rounded"
          >
            Reload
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
