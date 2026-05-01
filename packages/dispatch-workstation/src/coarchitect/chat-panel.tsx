import { useState, useEffect, useRef, type FormEvent, type RefObject } from 'react';
import type { DaemonClient, ChatMessage } from './daemon-client.js';

export interface ChatPanelProps {
  readonly daemonClient: DaemonClient;
}

export function ChatPanel({ daemonClient }: ChatPanelProps): JSX.Element {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const inputRef: RefObject<HTMLInputElement | null> = useRef(null);

  useEffect(() => {
    console.log('RENDER_OK');
    daemonClient.fetchHistory().then(setHistory);
  }, [daemonClient]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const content = (inputRef.current?.value ?? '').trim();
    if (!content || thinking) return;
    if (inputRef.current) inputRef.current.value = '';

    setThinking(true);
    try {
      await daemonClient.postMessage({ role: 'user', content });
      const updated = await daemonClient.fetchHistory();
      setHistory(updated);
      console.log(`MESSAGE_SENT ${content}`);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div>
      <div role="log" aria-live="polite">
        {history.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.role}</strong>: {msg.content}
          </div>
        ))}
      </div>
      {thinking && <div aria-live="assertive">Thinking…</div>}
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          data-testid="chat-input"
          type="text"
          placeholder="Type a message…"
          disabled={thinking}
        />
        <button data-testid="send-button" type="submit" disabled={thinking}>
          Send
        </button>
      </form>
    </div>
  );
}
