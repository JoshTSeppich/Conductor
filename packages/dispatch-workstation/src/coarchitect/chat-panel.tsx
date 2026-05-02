import { useState, useEffect, useRef, type FormEvent, type RefObject } from 'react';
import type { DaemonClient, ChatMessage } from './daemon-client.js';

export interface StreamingBridge {
  sendAndStream(content: string): void;
  onStreamChunk(cb: (chunk: string) => void): () => void;
  onStreamDone(cb: (preview: string) => void): () => void;
  onStreamError(cb: (err: { code: string; message: string }) => void): () => void;
}

export interface ChatPanelProps {
  readonly daemonClient: DaemonClient;
  readonly streamingBridge?: StreamingBridge | null;
}

export function ChatPanel({ daemonClient, streamingBridge }: ChatPanelProps): JSX.Element {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [deliberating, setDeliberating] = useState(false);
  const [inProgress, setInProgress] = useState('');
  const [streamError, setStreamError] = useState<{ code: string; message: string } | null>(null);
  const inputRef: RefObject<HTMLInputElement | null> = useRef(null);
  const streamStartedRef = useRef(false);
  const deliberatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('RENDER_OK');
    daemonClient.fetchHistory().then(setHistory);
  }, [daemonClient]);

  // Cleanup deliberating timer on unmount.
  useEffect(() => {
    return () => {
      if (deliberatingTimerRef.current) clearTimeout(deliberatingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!streamingBridge) return;

    const removeChunk = streamingBridge.onStreamChunk((chunk) => {
      if (!streamStartedRef.current) {
        streamStartedRef.current = true;
        if (deliberatingTimerRef.current) {
          clearTimeout(deliberatingTimerRef.current);
          deliberatingTimerRef.current = null;
        }
        setDeliberating(false);
        console.log('STREAM_START');
      }
      setInProgress((prev) => prev + chunk);
    });

    const removeDone = streamingBridge.onStreamDone((preview) => {
      setThinking(false);
      setDeliberating(false);
      setInProgress('');
      streamStartedRef.current = false;
      if (deliberatingTimerRef.current) {
        clearTimeout(deliberatingTimerRef.current);
        deliberatingTimerRef.current = null;
      }
      daemonClient.fetchHistory().then(setHistory);
      console.log(`STREAM_DONE ${preview}`);
    });

    const removeError = streamingBridge.onStreamError((err) => {
      setThinking(false);
      setDeliberating(false);
      setInProgress('');
      streamStartedRef.current = false;
      if (deliberatingTimerRef.current) {
        clearTimeout(deliberatingTimerRef.current);
        deliberatingTimerRef.current = null;
      }
      setStreamError(err);
      console.log(`STREAM_ERROR ${err.code}`);
    });

    return () => {
      removeChunk();
      removeDone();
      removeError();
    };
  }, [streamingBridge, daemonClient]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const content = (inputRef.current?.value ?? '').trim();
    if (!content || thinking) return;
    if (inputRef.current) inputRef.current.value = '';
    setStreamError(null);

    if (streamingBridge) {
      setThinking(true);
      streamStartedRef.current = false;
      // F3-UX-1: show "Deliberating…" if no first chunk within 2s (p95 TTFT ~20s).
      deliberatingTimerRef.current = setTimeout(() => {
        setDeliberating(true);
      }, 2000);
      streamingBridge.sendAndStream(content);
    } else {
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
  }

  return (
    <div>
      <div role="log" aria-live="polite">
        {history.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.role}</strong>: {msg.content}
          </div>
        ))}
        {inProgress && (
          <div>
            <strong>assistant</strong>: {inProgress}
          </div>
        )}
      </div>
      {thinking && !inProgress && (
        <div aria-live="assertive">{deliberating ? 'Deliberating…' : 'Thinking…'}</div>
      )}
      {streamError && (
        <div role="alert" aria-live="assertive">
          Error ({streamError.code}): {streamError.message}
        </div>
      )}
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
