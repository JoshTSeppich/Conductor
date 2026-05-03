// @vitest-environment happy-dom
//
// MB-T08 Cluster 3 — Test 3/6: ErrorToast renders SessionCapExceeded.
// SessionCapExceeded is Session A's MB-T06 territory; this test only validates
// that the toast can render the envelope shape. The actual error_type string
// is the agreed wire shape; the toast must already accept it on day one so
// MB-T06's controller→toast integration ships without an error-toast amendment.
//
// RED state: src/error-display/error-toast.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorToast } from '../../../src/error-display/error-toast.js';

describe('MB-T08 cluster 3 — ErrorToast SessionCapExceeded', () => {
  it('renders a friendly title that mentions the cap', () => {
    render(
      <ErrorToast
        error={{
          type: 'SessionCapExceeded',
          message: 'session cap (4) reached; close a session before spawning another',
          cap: 4,
        }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByTestId('error-toast-title')).toHaveTextContent(
      /cap|limit/i,
    );
  });

  it('exposes the cap value in the technical details', () => {
    render(
      <ErrorToast
        error={{
          type: 'SessionCapExceeded',
          message: 'session cap (4) reached; close a session before spawning another',
          cap: 4,
        }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByTestId('error-toast-details').textContent).toContain('4');
  });
});
