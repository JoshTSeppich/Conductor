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
    <main className="p-6 font-sans bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-2">Conductor authentication</h1>
      <p className="mb-4">{helpText}</p>
      <form onSubmit={onSubmit}>
        <label className="block mb-2">
          Token
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            spellCheck={false}
            className="block w-full font-mono p-2 mt-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded"
          />
        </label>
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-3 py-1 border rounded bg-accent text-white disabled:opacity-50"
        >
          Connect
        </button>
      </form>
    </main>
  );
}
