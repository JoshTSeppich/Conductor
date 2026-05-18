// Orchestrator progress strip. Sits above the orchestrator log and gives the
// at-a-glance view of a build run: progress bar, per-slot status grid
// (sized to support up to 64 parallel agents), throughput + ETA.

function fmtClock(secs) {
  if (!isFinite(secs) || secs < 0) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function ProgressBar({ done, running, queued, total }) {
  const all = Math.max(total, done + running + queued, 1);
  const donePct    = (done    / all) * 100;
  const runningPct = (running / all) * 100;
  const queuedPct  = (queued  / all) * 100;
  return (
    <div className="ostrip-bar">
      <div className="ostrip-bar-seg ostrip-bar-done"
           style={{ width: `${donePct}%` }} />
      <div className="ostrip-bar-seg ostrip-bar-running"
           style={{ width: `${runningPct}%` }} />
      <div className="ostrip-bar-seg ostrip-bar-queued"
           style={{ width: `${queuedPct}%` }} />
    </div>
  );
}

function SlotGrid({ sessions, maxSlots, onSlotClick }) {
  // Fill `maxSlots` cells; first N take live sessions in order, rest are empty.
  // Slots are fixed 10px squares so 64 slots fit in 2-3 short rows.
  const slots = Array.from({ length: maxSlots }, (_, i) => sessions[i] || null);
  return (
    <div className="ostrip-slots">
      {slots.map((s, i) => {
        const status = s?.status || 'empty';
        const title = s ? `${s.name} · ${status}` : 'empty slot';
        return (
          <button
            key={i}
            className={`ostrip-slot ostrip-slot-${status}`}
            title={title}
            onClick={() => s && onSlotClick?.(s)}
            disabled={!s}
          >
            {s?.status === 'running' && <span className="ostrip-slot-pulse" />}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="ostrip-stat">
      <div className="ostrip-stat-label">{label}</div>
      <div className="ostrip-stat-value" style={accent ? { color: 'var(--accent)' } : undefined}>{value}</div>
    </div>
  );
}

function OrchestratorStrip({ attached, queue, sessions, runningCount, maxSlots, onSlotClick }) {
  const done = sessions.filter(s => s.status === 'done').length;
  const errored = sessions.filter(s => s.status === 'error').length;
  const queued = queue.length;
  const total = attached?.steps || (done + runningCount + queued || maxSlots);

  // Throughput: track done count over a rolling window
  const histRef = React.useRef([]);
  const [throughput, setThroughput] = React.useState(0);
  React.useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      histRef.current.push({ t: now, done });
      histRef.current = histRef.current.filter(h => now - h.t < 30000);
      if (histRef.current.length >= 2) {
        const oldest = histRef.current[0];
        const delta = done - oldest.done;
        const secs = (now - oldest.t) / 1000;
        setThroughput(secs > 0 ? (delta / secs) * 60 : 0);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [done]);

  const eta = throughput > 0 && queue.length > 0
    ? (queue.length / (throughput / 60))
    : null;

  return (
    <div className="ostrip">
      <div className="ostrip-header">
        <div className="ostrip-title">
          <span className="ostrip-mark">▦</span>
          <span className="ostrip-title-text">
            {attached ? attached.name : 'build progress'}
          </span>
          {attached && (
            <span className="ostrip-count">
              {done + runningCount}/{total}
            </span>
          )}
        </div>
        <div className="ostrip-stats">
          <Stat label="running"  value={runningCount} accent />
          <Stat label="queued"   value={queued} />
          <Stat label="done"     value={done} />
          {errored > 0 && <Stat label="failed" value={errored} />}
          <Stat label="rate"     value={`${throughput.toFixed(1)}/min`} />
          {eta != null && <Stat label="eta" value={fmtClock(eta)} />}
        </div>
      </div>

      <ProgressBar done={done} running={runningCount} queued={queued} total={total} />

      <div className="ostrip-footer">
        <div className="ostrip-slots-wrap">
          <SlotGrid sessions={sessions} maxSlots={maxSlots} onSlotClick={onSlotClick} />
        </div>
        <div className="ostrip-legend">
          <span><i className="leg leg-running" />running</span>
          <span><i className="leg leg-starting" />starting</span>
          <span><i className="leg leg-done" />done</span>
          <span><i className="leg leg-error" />failed</span>
          <span><i className="leg leg-empty" />idle</span>
        </div>
      </div>
    </div>
  );
}

window.OrchestratorStrip = OrchestratorStrip;
