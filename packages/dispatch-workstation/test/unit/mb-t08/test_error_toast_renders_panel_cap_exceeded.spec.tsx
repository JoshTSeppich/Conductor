// @vitest-environment happy-dom
//
// MB-T08 Cluster 3 — Test 4/6: ErrorToast renders PanelCapExceeded.
// Source: console-ipc.ts:142 throws WorkstationError('PanelCapExceeded').
// Per main.ts:101, the existing CC-Console menu currently swallows this
// error; the toast surfaces it once main.ts is wired to forward via
// error-display.
//
// RED state: src/error-display/error-toast.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorToast } from '../../../src/error-display/error-toast.js';

describe('MB-T08 cluster 3 — ErrorToast PanelCapExceeded', () => {
  it('renders a friendly title for PanelCapExceeded', () => {
    render(
      <ErrorToast
        error={{
          type: 'PanelCapExceeded',
          message: 'console panel cap (4) reached; close a panel before opening another',
        }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByTestId('error-toast-title')).toHaveTextContent(
      /panel|console|cap|limit/i,
    );
  });
});
