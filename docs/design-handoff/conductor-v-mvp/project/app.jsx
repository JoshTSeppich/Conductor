// Main app: wires the Orchestrator (a big focused tmux pane), the surrounding
// agent tiles that pop in/out as work spawns and dies, and the Conductor chat
// at the bottom that parses build.md and pipes steps to the Orchestrator.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "side",
  "theme": "dark",
  "accent": "#f0a062",
  "density": "normal",
  "maxSlots": 32,
  "showWatermark": true
}/*EDITMODE-END*/;

const AGENT_TYPES = ['frontend','api','db','deploy','test','lint','worker','docs'];
const SAMPLE_BUILD_MD = {
  name: 'auth-rewrite.build.md',
  steps: [
    { target: 'api',      task: 'scaffold POST /sessions route + handler' },
    { target: 'db',       task: 'migration: add sessions table w/ refresh_token jti' },
    { target: 'api',      task: 'wire argon2id password hashing on signup' },
    { target: 'test',     task: 'integration tests for /sessions happy path' },
    { target: 'frontend', task: 'build SignInForm + useSession hook' },
    { target: 'frontend', task: 'gate /dashboard behind useSession redirect' },
    { target: 'lint',     task: 'biome check --apply across packages/auth' },
    { target: 'test',     task: 'e2e: sign-in → dashboard → sign-out' },
    { target: 'docs',     task: 'auth flow diagram + endpoint reference' },
    { target: 'deploy',   task: 'fly deploy api to staging, smoke-test /healthz' },
  ],
};

let _pid = 84000;
let _msgId = 1;
let _agentSeq = {};
function nextPid() { return ++_pid; }
function nextMsgId() { return 'm' + (++_msgId); }
function nextAgentSeq(type) {
  _agentSeq[type] = (_agentSeq[type] || 0) + 1;
  return _agentSeq[type];
}

function spawnSession(type, taskNote) {
  const tmpl = AGENT_TEMPLATES[type];
  const seq = nextAgentSeq(type);
  return {
    id: 'sess-' + Math.random().toString(36).slice(2, 8),
    name: `agent-${type}-${String(seq).padStart(2,'0')}`,
    type,
    cmd: tmpl.cmd,
    pid: nextPid(),
    cwd: `~/workspace/${type}`,
    status: 'starting',
    elapsed: 0,
    cpu: 1 + Math.floor(Math.random() * 8),
    allLines: tmpl.lines,
    visibleLines: [],
    taskNote: taskNote || null,
    entering: true,
    exiting: false,
    createdAt: Date.now(),
    finishAfter: 12 + Math.floor(Math.random() * 12), // seconds to "finish"
  };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme + accent globally
  React.useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.theme, t.accent]);

  // Sessions
  const [sessions, setSessions] = React.useState(() => [
    { ...spawnSession('api'),      taskNote: 'scaffold POST /sessions route + handler' },
    { ...spawnSession('frontend'), taskNote: 'build SignInForm + useSession hook' },
    { ...spawnSession('test'),     taskNote: 'integration tests for /sessions happy path' },
  ]);
  const [focusedId, setFocusedId] = React.useState(null);

  // Orchestrator pane content (always present, separate from agents)
  const [orchLines, setOrchLines] = React.useState(ORCH_BANNER);

  // Conductor chat
  const [messages, setMessages] = React.useState(() => [
    { id: nextMsgId(), role: 'assistant', text: "Conductor ready. Attach a build.md and I'll plan it into ordered steps, hand them to the Orchestrator one at a time, and watch the agent panes for failures." },
  ]);
  const [attached, setAttached] = React.useState(null);
  const [queue, setQueue] = React.useState([]);
  const [paused, setPaused] = React.useState(false);

  // ── Session lifecycle: stream lines, age, finish, exit, reflow ─────────
  React.useEffect(() => {
    const tick = setInterval(() => {
      setSessions(prev => {
        let next = prev.map(s => {
          if (s.exiting) return s;
          let status = s.status;
          let visibleLines = s.visibleLines;
          let elapsed = s.elapsed + 0.4;
          let cpu = Math.max(1, Math.min(98, s.cpu + (Math.random() - 0.5) * 8));

          // After 0.6s, flip starting -> running
          if (status === 'starting' && elapsed > 0.6) status = 'running';

          // Stream lines while running
          if (status === 'running' && visibleLines.length < s.allLines.length) {
            const burst = 1 + Math.floor(Math.random() * 2);
            visibleLines = s.allLines.slice(0, visibleLines.length + burst);
          }

          // Finish after threshold
          if (status === 'running' && elapsed > s.finishAfter) {
            status = Math.random() < 0.12 ? 'error' : 'done';
          }

          // Clear entering flag after first frame
          const entering = false;

          return { ...s, status, visibleLines, elapsed, cpu, entering };
        });

        // Mark old done/error sessions as exiting after 4s of being terminal
        next = next.map(s => {
          if ((s.status === 'done' || s.status === 'error') && !s.exiting && s.elapsed > s.finishAfter + 4) {
            return { ...s, exiting: true };
          }
          return s;
        });

        return next;
      });
    }, 400);

    return () => clearInterval(tick);
  }, []);

  // Remove exiting sessions after their animation
  React.useEffect(() => {
    const exiting = sessions.filter(s => s.exiting);
    if (!exiting.length) return;
    const to = setTimeout(() => {
      setSessions(prev => {
        const removed = prev.filter(s => s.exiting).map(s => s.taskNote ? `${s.name} finished: ${s.taskNote}` : `${s.name} exited`);
        if (removed.length) {
          setOrchLines(o => [
            ...o,
            ...removed.map(r => ({ t: 'ok', s: `  ✓ ${r}` })),
          ]);
        }
        return prev.filter(s => !s.exiting);
      });
    }, 320);
    return () => clearTimeout(to);
  }, [sessions]);

  // Ambient: occasionally spawn an idle agent so the grid feels alive
  React.useEffect(() => {
    if (attached) return; // when piping build.md, we control spawns explicitly
    const iv = setInterval(() => {
      setSessions(prev => {
        if (prev.length >= 6) return prev;
        const liveTypes = new Set(prev.filter(s => !s.exiting).map(s => s.type));
        const choices = AGENT_TYPES.filter(t => !liveTypes.has(t));
        if (!choices.length) return prev;
        const type = choices[Math.floor(Math.random() * choices.length)];
        const s = spawnSession(type);
        setOrchLines(o => [...o, { t: 'sys', s: `  ↳ spawn  ${s.name}  pid=${s.pid}` }]);
        return [...prev, s];
      });
    }, 5500);
    return () => clearInterval(iv);
  }, [attached]);

  // Auto-trim orchestrator log to last ~140 lines
  React.useEffect(() => {
    if (orchLines.length > 140) {
      setOrchLines(o => o.slice(-140));
    }
  }, [orchLines.length]);

  // ── Chat actions ────────────────────────────────────────────────────────
  function send(text) {
    setMessages(m => [...m, { id: nextMsgId(), role: 'user', text }]);
    // Mini canned reply
    setTimeout(() => {
      setMessages(m => [...m, {
        id: nextMsgId(),
        role: 'assistant',
        text: attached
          ? `Noted. I'll fold that into the next dispatch for ${attached.name}.`
          : "Drop a build.md when you're ready — I'll plan it into steps and start handing them off.",
      }]);
    }, 600);
  }

  function attach() {
    setAttached({ name: SAMPLE_BUILD_MD.name, steps: SAMPLE_BUILD_MD.steps.length });
    setQueue([...SAMPLE_BUILD_MD.steps]);
    setPaused(false);
    const lines = [
      { id: nextMsgId(), role: 'user', text: '📎 auth-rewrite.build.md' },
      { id: nextMsgId(), role: 'assistant', text: `Parsed ${SAMPLE_BUILD_MD.steps.length} steps across ${new Set(SAMPLE_BUILD_MD.steps.map(s => s.target)).size} agents. Auto-dispatching in order — pause anytime if a pane looks wrong.` },
    ];
    setMessages(m => [...m, ...lines]);
    setOrchLines(o => [
      ...o,
      { t: 'sys', s: '' },
      { t: 'banner', s: `─── conductor handed off: ${SAMPLE_BUILD_MD.name} (${SAMPLE_BUILD_MD.steps.length} steps) ───` },
    ]);
  }

  function detach() {
    setAttached(null);
    setQueue([]);
    setPaused(false);
  }

  function dispatchNext() {
    if (!queue.length || paused) return;
    const [step, ...rest] = queue;
    const stepNum = attached.steps - rest.length;
    setQueue(rest);
    setMessages(m => [...m, {
      id: nextMsgId(),
      role: 'dispatch',
      step: stepNum,
      total: attached.steps,
      target: `agent-${step.target}`,
      task: step.task,
    }]);
    // Spawn the agent (or reuse a running one of that type)
    setSessions(prev => {
      const live = prev.find(s => s.type === step.target && !s.exiting && (s.status === 'running' || s.status === 'starting'));
      if (live) {
        setOrchLines(o => [...o, { t: 'sys', s: `  → tell ${live.name} (pid ${live.pid}): ${step.task}` }]);
        return prev;
      }
      const s = spawnSession(step.target, step.task);
      setOrchLines(o => [
        ...o,
        { t: 'sys', s: `  ↳ spawn  ${s.name}  pid=${s.pid}` },
        { t: 'sys', s: `  → tell ${s.name}: ${step.task}` },
      ]);
      return [...prev, s];
    });
  }

  // Auto-dispatch loop while build.md is attached and not paused
  React.useEffect(() => {
    if (!attached || paused || !queue.length) return;
    const to = setTimeout(dispatchNext, 4200);
    return () => clearTimeout(to);
  }, [attached, paused, queue.length]);

  function cancelRun() {
    setMessages(m => [...m, {
      id: nextMsgId(), role: 'system',
      text: `cancelled · ${queue.length} step${queue.length === 1 ? '' : 's'} dropped from the queue`,
    }]);
    detach();
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  const liveSessions = sessions.filter(s => !s.exiting || true); // include exiting so they animate out
  const runningCount = sessions.filter(s => s.status === 'running' || s.status === 'starting').length;

  // Orchestrator is its own "session-shaped" object for TmuxPane
  const orchSession = {
    id: 'orchestrator',
    name: 'orchestrator',
    type: 'orchestrator',
    cmd: attached ? `conductor pipe ${attached.name}` : 'conductor wait',
    pid: 84001,
    cwd: '~/workspace',
    status: runningCount > 0 ? 'running' : 'starting',
    elapsed: Math.floor((Date.now() - 1747490000000) / 1000) % 9999,
    cpu: 12,
    visibleLines: orchLines,
  };

  return (
    <div className={`app app-layout-${t.layout} app-density-${t.density}`}>
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <span className="brand-glyph">◐</span>
            <span className="brand-name">Conductor</span>
            <span className="brand-version">v_mvp</span>
          </div>
          <span className="topbar-sep" />
          <span className="topbar-meta">{sessions.length} pane{sessions.length === 1 ? '' : 's'}</span>
          <span className="topbar-sep" />
          <span className="topbar-meta">{runningCount} running</span>
          {attached && (
            <>
              <span className="topbar-sep" />
              <span className="topbar-meta">
                queue: {queue.length} · done: {attached.steps - queue.length - runningCount}
              </span>
            </>
          )}
        </div>
        <div className="topbar-right">
          <span className="topbar-meta">staging · us-east</span>
          <span className="topbar-sep" />
          <span className="topbar-meta">$4.21 / $10.00</span>
        </div>
      </header>

      <div className="workspace">
        <section className="orchestrator-region">
          <div className="region-label">
            <span className="region-label-text">ORCHESTRATOR</span>
            <span className="region-label-line" />
          </div>
          <div className="orchestrator-grid">
            <div className="orch-main-slot">
              <OrchestratorStrip
                attached={attached}
                queue={queue}
                sessions={sessions}
                runningCount={runningCount}
                maxSlots={t.maxSlots}
                onSlotClick={s => setFocusedId(s.id)}
              />
              <TmuxPane session={orchSession} big focused />
            </div>
            <div className={`agent-grid agent-grid-${t.layout} ${sessions.length > 10 ? 'agent-grid-mini' : ''}`}>
              {sessions.map(s => (
                sessions.length > 10
                  ? <TmuxMiniTile key={s.id} session={s} onFocus={() => setFocusedId(s.id)} />
                  : <TmuxPane
                      key={s.id}
                      session={s}
                      focused={s.id === focusedId}
                      onFocus={() => setFocusedId(s.id)}
                      density={t.density}
                    />
              ))}
              {sessions.length === 0 && (
                <div className="agent-empty">no agents · waiting</div>
              )}
            </div>
          </div>
        </section>

        <section className="conductor-region">
          <div className="region-label region-label-bottom">
            <span className="region-label-text">CONDUCTOR</span>
            <span className="region-label-line" />
          </div>
          <ConductorChat
            messages={messages}
            attached={attached}
            queue={queue}
            running={runningCount}
            total={attached?.steps || 0}
            paused={paused}
            onSend={send}
            onAttach={attach}
            onDetach={detach}
            onDispatchNext={dispatchNext}
            onTogglePause={() => setPaused(p => !p)}
            onCancel={cancelRun}
          />
        </section>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout">
          <TweakRadio label="Agent tiles" value={t.layout} options={[
            { value: 'side',   label: 'Side rail' },
            { value: 'bottom', label: 'Bottom strip' },
          ]} onChange={v => setTweak('layout', v)} />
          <TweakRadio label="Density" value={t.density} options={[
            { value: 'compact', label: 'Compact' },
            { value: 'normal',  label: 'Normal' },
          ]} onChange={v => setTweak('density', v)} />
        </TweakSection>
        <TweakSection label="Theme">
          <TweakRadio label="Mode" value={t.theme} options={[
            { value: 'dark',  label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]} onChange={v => setTweak('theme', v)} />
          <TweakColor label="Accent" value={t.accent} options={['#f0a062','#6ad4b8','#8aa6f0','#d97a9c','#c4c4c8']} onChange={v => setTweak('accent', v)} />
        </TweakSection>
        <TweakSection label="Capacity">
          <TweakRadio label="Max parallel" value={t.maxSlots} options={[
            { value: 16, label: '16' },
            { value: 32, label: '32' },
            { value: 64, label: '64' },
          ]} onChange={v => setTweak('maxSlots', v)} />
        </TweakSection>
        <TweakSection label="Demo">
          <TweakButton label="Spawn random agent" onClick={() => {
            const liveTypes = new Set(sessions.filter(s => !s.exiting).map(s => s.type));
            const choices = AGENT_TYPES.filter(t => !liveTypes.has(t));
            if (!choices.length) return;
            const type = choices[Math.floor(Math.random() * choices.length)];
            const s = spawnSession(type);
            setSessions(prev => [...prev, s]);
            setOrchLines(o => [...o, { t: 'sys', s: `  ↳ spawn  ${s.name}  pid=${s.pid}` }]);
          }} />
          <TweakButton label="Burst spawn 20" onClick={() => {
            const burst = [];
            for (let i = 0; i < 20; i++) {
              const type = AGENT_TYPES[i % AGENT_TYPES.length];
              const s = spawnSession(type);
              // Vary lifetimes for visual interest
              s.finishAfter = 8 + Math.floor(Math.random() * 18);
              burst.push(s);
            }
            setSessions(prev => [...prev, ...burst]);
            setOrchLines(o => [
              ...o,
              { t: 'banner', s: `─── burst spawn: 20 agents queued ───` },
            ]);
          }} />
          <TweakButton label="Kill oldest agent" onClick={() => {
            setSessions(prev => {
              const live = prev.filter(s => !s.exiting && s.status !== 'done' && s.status !== 'error');
              if (!live.length) return prev;
              const oldest = live[0];
              return prev.map(s => s.id === oldest.id ? { ...s, status: 'done' } : s);
            });
          }} />
          <TweakButton label="Attach sample build.md" onClick={attach} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
