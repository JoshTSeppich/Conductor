import { useState, type FormEvent, type ReactNode } from 'react';
import { writeToken } from '../auth/token-storage.js';
import { useUIStore } from '../store/ui.js';

export interface TokenPromptProps {
  reason: 'missing' | 'invalid';
}

export function TokenPrompt({ reason }: TokenPromptProps): ReactNode {
  const [value, setValue] = useState('');
  const bumpAuthRetry = useUIStore((s) => s.bumpAuthRetry);

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    writeToken(trimmed);
    bumpAuthRetry();
  }

  const helpText =
    reason === 'invalid'
      ? 'The stored token was rejected. Paste a fresh one.'
      : 'Run `cat ~/.foxworks-dispatch/token` and paste the contents below.';

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Conductor authentication</h1>
      <p>{helpText}</p>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Token
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            spellCheck={false}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              padding: 8,
              marginTop: 4,
            }}
          />
        </label>
        <button type="submit" disabled={!value.trim()}>
          Connect
        </button>
      </form>
    </main>
  );
}
