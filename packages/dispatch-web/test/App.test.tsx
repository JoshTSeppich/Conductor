import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App.js';

describe('WEB-T01 App scaffold', () => {
  it('renders the Conductor dashboard placeholder', () => {
    render(<App />);
    expect(screen.getByText(/conductor/i)).toBeInTheDocument();
  });

  it('catches errors thrown in children via the top-level ErrorBoundary', () => {
    const Boom: React.FC = () => {
      throw new Error('intentional test error');
    };
    render(
      <App>
        <Boom />
      </App>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
  });
});
