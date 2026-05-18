// TmuxPane: a single fake tmux session. Streams lines with a typing rhythm,
// shows a header bar with session name/cmd/status, a blinking cursor,
// and animates in/out as it spawns and dies.

const TMUX_COLORS = {
  sys:    'var(--mono)',
  ok:     'var(--ok)',
  warn:   'var(--warn)',
  err:    'var(--err)',
  banner: 'var(--accent)',
};

function StatusDot({ status }) {
  const color = {
    starting: 'var(--warn)',
    running:  'var(--ok)',
    done:     'var(--mono-dim)',
    error:    'var(--err)',
  }[status] || 'var(--mono-dim)';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7, height: 7, borderRadius: 99,
        background: color,
        boxShadow: status === 'running' ? `0 0 6px ${color}` : 'none',
        animation: status === 'starting' ? 'pulse 1.1s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    />
  );
}

function TmuxPane({ session, focused, big, onFocus, density }) {
  const bodyRef = React.useRef(null);
  const visibleLines = session.visibleLines || [];

  React.useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visibleLines.length]);

  const fontSize = big ? 13 : (density === 'compact' ? 9.5 : 10.5);
  const lineHeight = big ? 1.55 : 1.45;

  // Decoration row count to fake out a window header
  return (
    <div
      className={`tmux-pane ${focused ? 'tmux-focused' : ''} ${big ? 'tmux-big' : 'tmux-small'} tmux-${session.status}`}
      onClick={onFocus}
      style={{
        animation: session.entering ? 'paneIn 360ms cubic-bezier(.22,.9,.3,1.2)' : (session.exiting ? 'paneOut 280ms ease forwards' : 'none'),
      }}
    >
      <div className="tmux-titlebar">
        <div className="tmux-titlebar-left">
          <StatusDot status={session.status} />
          <span className="tmux-name">{session.name}</span>
          {big && <span className="tmux-sep">·</span>}
          {big && <span className="tmux-cmd">{session.cmd}</span>}
        </div>
        <div className="tmux-titlebar-right">
          {big ? (
            <>
              <span className="tmux-meta">pid {session.pid}</span>
              <span className="tmux-sep">·</span>
              <span className="tmux-meta">{Math.floor(session.elapsed)}s</span>
              <span className="tmux-sep">·</span>
              <span className="tmux-meta">{Math.round(session.cpu)}% cpu</span>
            </>
          ) : (
            <span className="tmux-meta">{Math.floor(session.elapsed)}s</span>
          )}
        </div>
      </div>

      <div
        ref={bodyRef}
        className="tmux-body"
        style={{ fontSize, lineHeight }}
      >
        {!big && session.status === 'starting' && (
          <div className="tmux-spawning">spawning {session.name}…</div>
        )}
        {visibleLines.map((line, i) => (
          <div key={i} className="tmux-line" style={{ color: TMUX_COLORS[line.t] || 'var(--mono)' }}>
            {line.s || '\u00A0'}
          </div>
        ))}
        {session.status === 'running' && (
          <div className="tmux-line tmux-prompt">
            <span style={{ color: 'var(--accent)' }}>{session.cwd}</span>
            <span style={{ color: 'var(--mono-dim)' }}> $ </span>
            <span className="tmux-cursor" />
          </div>
        )}
        {session.status === 'done' && (
          <div className="tmux-line" style={{ color: 'var(--mono-dim)' }}>
            [process exited 0 — press any key]
          </div>
        )}
        {session.status === 'error' && (
          <div className="tmux-line" style={{ color: 'var(--err)' }}>
            [process exited 1 — press any key]
          </div>
        )}
      </div>
    </div>
  );
}

window.TmuxPane = TmuxPane;
window.StatusDot = StatusDot;

function TmuxMiniTile({ session, onFocus }) {
  return (
    <div
      className={`tmux-mini tmux-mini-${session.status}`}
      onClick={onFocus}
      style={{
        animation: session.entering ? 'paneIn 280ms cubic-bezier(.22,.9,.3,1.2)' : (session.exiting ? 'paneOut 240ms ease forwards' : 'none'),
      }}
      title={`${session.name} · ${session.status}${session.taskNote ? ' · ' + session.taskNote : ''}`}
    >
      <span className="tmux-mini-dot" />
      <span className="tmux-mini-name">{session.name}</span>
      <span className="tmux-mini-elapsed">{Math.floor(session.elapsed)}s</span>
    </div>
  );
}

window.TmuxMiniTile = TmuxMiniTile;
