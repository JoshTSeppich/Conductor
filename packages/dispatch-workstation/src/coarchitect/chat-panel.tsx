// MB-T21 WB2 (green) — ChatPanel refactored to render bubbles + scroll-pin.
// Operator-acked Q-MBT21-1=a (refactor in place; preserve chat-input +
// send-button testids) + Q-MBT21-8=a (tail-anchor scrollIntoView; smart-pin
// deferred to v3.1) + Q-MBT21-12=a (inline styles).
//
// Existing IPC contract preserved:
//   - StreamingBridge consumed unchanged (sendAndStream, onStream*).
//   - daemonClient.fetchHistory + postMessage unchanged.
//   - chat-input + send-button testids preserved (probe-03 + coarch-t02
//     integration tests load-bearing).
//
// New visual structure: bubble messages via <ChatBubble>; user (operator) ←
// right-aligned, assistant (conductor) ← left-aligned. Tail anchor at end
// of message list scroll-pins newest content into view.
//
// WB3 will compose <QuickPickButtons> + parseQuickPickMarker around assistant
// bubbles. WB4 will compose <SpawnedList> + parseSpawnedMarker. ChatBubble
// remains role+content only — composition happens at the ChatPanel level.

import { useState, useEffect, useRef, Fragment, type FormEvent, type RefObject } from 'react';
import type { DaemonClient, ChatMessage } from './daemon-client.js';
import { ChatBubble } from './chat-bubble.js';
import { QuickPickButtons } from './quick-pick-buttons.js';
import { SpawnedList } from './spawned-list.js';
import { parseQuickPickMarker, parseSpawnedMarker } from './chat-content-markers.js';

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
  const tailAnchorRef: RefObject<HTMLDivElement | null> = useRef(null);
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

  // Q-MBT21-8=a tail-anchor scroll-pin: scroll newest into view on history
  // change or streaming chunk extension. Smart-pin (don't yank if user
  // scrolled up) deferred to v3.1.
  useEffect(() => {
    tailAnchorRef.current?.scrollIntoView({ block: 'end' });
  }, [history.length, inProgress]);

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
      // F3-UX-1: show "Deliberating…" if no first chunk within 2s.
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
    <div
      data-testid="chat-panel-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: '#0f172a',
        color: '#e5e7eb',
      }}
    >
      <div
        role="log"
        aria-live="polite"
        data-testid="chat-panel-log"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 6px',
        }}
      >
        {history.map((msg) => {
          if (msg.role === 'assistant') {
            // Q-MBT21-2=b + Q-MBT21-3=b: parse QUICK_PICK + spawned: markers;
            // strip both from bubble body; render spawned-list + quick-pick
            // buttons inline below the bubble. Order: bubble → spawned-list
            // → quick-pick (informational context first, action last).
            const afterQuickPick = parseQuickPickMarker(msg.content);
            const afterSpawned = parseSpawnedMarker(afterQuickPick.stripped);
            return (
              <Fragment key={msg.id}>
                <ChatBubble role="assistant" content={afterSpawned.stripped} />
                {afterSpawned.sessions && (
                  <SpawnedList sessions={afterSpawned.sessions} />
                )}
                {afterQuickPick.options && (
                  <QuickPickButtons
                    options={afterQuickPick.options}
                    onSelect={(text) => streamingBridge?.sendAndStream(text)}
                  />
                )}
              </Fragment>
            );
          }
          return <ChatBubble key={msg.id} role={msg.role} content={msg.content} />;
        })}
        {inProgress && <ChatBubble role="assistant" content={inProgress} />}
        {thinking && !inProgress && (
          <div
            aria-live="assertive"
            data-testid="chat-panel-thinking"
            style={{
              alignSelf: 'flex-start',
              fontSize: 12,
              fontStyle: 'italic',
              color: '#9ca3af',
              padding: '4px 12px',
            }}
          >
            {deliberating ? 'Deliberating…' : 'Thinking…'}
          </div>
        )}
        {streamError && (
          <div
            role="alert"
            aria-live="assertive"
            data-testid="chat-panel-error"
            style={{
              alignSelf: 'stretch',
              margin: '6px 4px',
              padding: '6px 10px',
              borderRadius: 6,
              background: '#7f1d1d',
              color: '#fee2e2',
              fontSize: 12,
            }}
          >
            Error ({streamError.code}): {streamError.message}
          </div>
        )}
        <div ref={tailAnchorRef} data-testid="chat-tail-anchor" />
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px',
          borderTop: '1px solid #1f2937',
          background: '#0b1220',
        }}
      >
        <input
          ref={inputRef}
          data-testid="chat-input"
          type="text"
          placeholder="Type a message…"
          disabled={thinking}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #374151',
            background: '#111827',
            color: '#e5e7eb',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          data-testid="send-button"
          type="submit"
          disabled={thinking}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: thinking ? '#374151' : '#2563eb',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: thinking ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
