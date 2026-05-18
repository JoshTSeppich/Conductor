// Conductor chat: composer + message thread.
// Visually inspired by modern AI chat UIs (full-width prose, bottom composer, attachment chip)
// but original — no third-party branding.

function ConductorMessage({ m }) {
  if (m.role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="msg-user-bubble">{m.text}</div>
      </div>
    );
  }
  if (m.role === 'dispatch') {
    return (
      <div className="msg msg-dispatch">
        <div className="dispatch-rule" />
        <div className="dispatch-body">
          <div className="dispatch-head">
            <span className="dispatch-badge">DISPATCH</span>
            <span className="dispatch-step">step {m.step}/{m.total}</span>
            <span className="dispatch-arrow">→</span>
            <span className="dispatch-target">{m.target}</span>
          </div>
          <div className="dispatch-task">{m.task}</div>
        </div>
      </div>
    );
  }
  if (m.role === 'system') {
    return (
      <div className="msg msg-system">
        <span className="sys-dot" /> {m.text}
      </div>
    );
  }
  // assistant — Conductor speaking
  return (
    <div className="msg msg-assistant">
      <div className="msg-assistant-mark">C</div>
      <div className="msg-assistant-body">
        {m.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        {m.children}
      </div>
    </div>
  );
}

function BuildMdChip({ name, steps, onRemove }) {
  return (
    <div className="buildmd-chip">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1.5" width="9" height="11" rx="1" stroke="currentColor" strokeWidth="1"/>
        <path d="M4.5 5h4M4.5 7h4M4.5 9h2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      <span className="buildmd-chip-name">{name}</span>
      <span className="buildmd-chip-meta">{steps} steps</span>
      {onRemove && (
        <button className="buildmd-chip-x" onClick={onRemove} aria-label="Remove">×</button>
      )}
    </div>
  );
}

function ConductorChat({ messages, attached, onSend, onAttach, onDetach, onDispatchNext, queue, running, total, paused, onTogglePause, onCancel }) {
  const [draft, setDraft] = React.useState('');
  const threadRef = React.useRef(null);

  React.useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages.length]);

  function send() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <div className="conductor">
      <div className="conductor-header">
        <div className="conductor-title">
          <span className="conductor-mark">C</span>
          <span>Conductor</span>
          {attached && (
            <>
              <span className="conductor-sep">·</span>
              <span className="conductor-file">{attached.name}</span>
              <span className="conductor-progress">
                {total - queue.length}/{total}
              </span>
            </>
          )}
        </div>
        <div className="conductor-controls">
          {attached && (
            <>
              <button className="ctrl-btn" onClick={onTogglePause}>
                {paused ? '▶ resume' : '❚❚ pause'}
              </button>
              <button className="ctrl-btn ctrl-btn-danger" onClick={onCancel}>
                ✕ cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="conductor-thread" ref={threadRef}>
        {messages.map((m, i) => <ConductorMessage key={m.id || i} m={m} />)}
        {running > 0 && (
          <div className="msg msg-assistant msg-typing">
            <div className="msg-assistant-mark">C</div>
            <div className="msg-assistant-body">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              <span className="typing-label">watching {running} agent{running === 1 ? '' : 's'}…</span>
            </div>
          </div>
        )}
      </div>

      <div className="conductor-composer">
        {attached && (
          <div className="composer-attachments">
            <BuildMdChip name={attached.name} steps={attached.steps} onRemove={onDetach} />
            {queue.length > 0 && !paused && (
              <button className="dispatch-next-btn" onClick={onDispatchNext}>
                dispatch next →
              </button>
            )}
          </div>
        )}
        <div className="composer-row">
          <button className="composer-icon-btn" onClick={onAttach} title="Attach build.md">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3l4 4-7 7a3 3 0 01-4.24-4.24L9 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <textarea
            className="composer-input"
            placeholder={attached
              ? "Add guidance, or hit ↵ to start dispatching…"
              : "Drop a build.md or ask the Conductor to do something…"}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
          />
          <button className="composer-send" onClick={send} disabled={!draft.trim()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="composer-hint">
          <kbd>↵</kbd> send · <kbd>⇧↵</kbd> newline · build.md is parsed into ordered steps and piped one at a time to the Orchestrator
        </div>
      </div>
    </div>
  );
}

window.ConductorChat = ConductorChat;
