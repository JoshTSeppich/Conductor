import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';

// Tests adapted at WEB-T02 green for AuthBootstrap's async gating:
//  - test 1 uses findByText (async) because AuthBootstrap's
//    'bootstrapping' phase briefly renders "Connecting…" before
//    transitioning to 'prompt' where TokenPrompt's h1 contains
//    "Conductor".
//  - test 2 pre-populates localStorage so preflight succeeds; the
//    ErrorBoundary's catch semantics are UNCHANGED — it still
//    catches any error thrown in its descendant tree. The test just
//    needs children to actually render before Boom can throw.
describe('WEB-T01 App scaffold', () => {
  it('renders something containing "Conductor" after bootstrap resolves', async () => {
    render(<App />);
    expect(await screen.findByText(/conductor/i)).toBeInTheDocument();
  });

  it('catches errors thrown in children via the top-level ErrorBoundary', async () => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
    function Boom(): never {
      throw new Error('intentional test error');
    }
    render(
      <App>
        <Boom />
      </App>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
