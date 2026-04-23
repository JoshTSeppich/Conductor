import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { AuthBootstrap } from '../src/components/AuthBootstrap.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';

describe('WEB-T02 AuthBootstrap', () => {
  it('shows TokenPrompt when localStorage has no token', async () => {
    render(
      <AuthBootstrap>
        <div>dashboard</div>
      </AuthBootstrap>,
    );
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('renders children on happy path when health + events both 200', async () => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
    render(
      <AuthBootstrap>
        <div>dashboard-content</div>
      </AuthBootstrap>,
    );
    expect(await screen.findByText('dashboard-content')).toBeInTheDocument();
  });

  it('clears stored token and re-shows TokenPrompt on events 401', async () => {
    localStorage.setItem('x-conductor-token', 'wrong-token');
    render(
      <AuthBootstrap>
        <div>dashboard</div>
      </AuthBootstrap>,
    );
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
    expect(localStorage.getItem('x-conductor-token')).toBeNull();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('shows ConnectionStatusBanner when health errors (daemon_down)', async () => {
    server.use(http.get('/v2/health', () => HttpResponse.error()));
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
    render(
      <AuthBootstrap>
        <div>dashboard</div>
      </AuthBootstrap>,
    );
    expect(await screen.findByText(/daemon unreachable/i)).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });
});
