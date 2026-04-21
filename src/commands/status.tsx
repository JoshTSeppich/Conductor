import { useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import { stat } from 'node:fs/promises';
import { readRegistry } from '../registry/read.js';
import { deriveState, type SessionState } from '../state/derive.js';
import type { Session } from '../registry/schema.js';

export interface StatusRow {
  name: string;
  state: SessionState;
  target: string;
  ageText: string;
}

/**
 * §6.1 sort: awaiting_review first (drain the review queue), stale
 * second (decide nudge-or-kill), running third (in-flight, no action),
 * idle last (cold). Secondary sort is insertion order — the contract
 * explicitly forbids a silent alphabetical or age-based tiebreaker.
 */
const SORT_PRIORITY: Record<SessionState, number> = {
  awaiting_review: 0,
  stale: 1,
  running: 2,
  idle: 3,
};

export function sortRows(rows: StatusRow[]): StatusRow[] {
  return [...rows].sort((a, b) => SORT_PRIORITY[a.state] - SORT_PRIORITY[b.state]);
}

function stateColor(state: SessionState): string {
  switch (state) {
    case 'awaiting_review':
      return 'yellow';
    case 'stale':
      return 'red';
    case 'running':
      return 'cyan';
    case 'idle':
      return 'gray';
  }
}

function padRight(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

export function StatusView({ rows }: { rows: StatusRow[] }) {
  const sorted = sortRows(rows);
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>
          {padRight('NAME', 20)}
          {padRight('STATE', 18)}
          {padRight('AGE', 10)}
          TARGET
        </Text>
      </Box>
      {sorted.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>(no sessions registered — run: fd init NAME --cwd PATH --target T)</Text>
        </Box>
      ) : (
        sorted.map((row) => (
          <Box key={row.name}>
            <Text>{padRight(row.name, 20)}</Text>
            <Text color={stateColor(row.state)} bold>
              {padRight(row.state.toUpperCase(), 18)}
            </Text>
            <Text>{padRight(row.ageText, 10)}</Text>
            <Text dimColor>{row.target}</Text>
          </Box>
        ))
      )}
      <Box marginTop={1}>
        <Text dimColor>
          keys: [r] refresh  [s] send  [w] watch  [q] quit   (inactive in v1)
        </Text>
      </Box>
    </Box>
  );
}

const STALE_MS = 30 * 60 * 1000;

function formatAge(ms: number): string {
  if (ms < 60_000) return '<1m';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function latestActionMs(session: Session): number | null {
  const candidates: number[] = [];
  if (session.last_prompt_sent_at !== null)
    candidates.push(Date.parse(session.last_prompt_sent_at));
  if (session.last_handoff_pulled_at !== null)
    candidates.push(Date.parse(session.last_handoff_pulled_at));
  return candidates.length === 0 ? null : Math.max(...candidates);
}

export async function loadRows(registryPath?: string): Promise<StatusRow[]> {
  const registry = await readRegistry(registryPath);
  const now = new Date();
  const rows: StatusRow[] = [];
  for (const [name, session] of Object.entries(registry.sessions)) {
    let mtime: Date | null = null;
    try {
      const s = await stat(session.handoff_path);
      mtime = s.mtime;
    } catch {
      /* handoff file absent — null mtime, derive will treat as no-handoff */
    }
    const state = deriveState({
      last_prompt_sent_at: session.last_prompt_sent_at,
      last_handoff_pulled_at: session.last_handoff_pulled_at,
      handoff_mtime: mtime,
      now,
      stale_threshold_ms: STALE_MS,
    });
    const latest = latestActionMs(session);
    const ageText = latest === null ? '—' : formatAge(now.getTime() - latest);
    rows.push({ name, state, target: session.tmux_target, ageText });
  }
  return rows;
}

export function StatusApp({ registryPath }: { registryPath?: string }) {
  const [rows, setRows] = useState<StatusRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const next = await loadRows(registryPath);
        if (!cancelled) setRows(next);
      } catch {
        /* swallow — don't crash the TUI on a single bad tick; next poll retries */
      }
    }
    void tick();
    const interval = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [registryPath]);

  if (rows === null) {
    return (
      <Box>
        <Text dimColor>loading registry…</Text>
      </Box>
    );
  }
  return <StatusView rows={rows} />;
}

export async function runStatus(opts?: { registryPath?: string }): Promise<void> {
  const { waitUntilExit } = render(<StatusApp registryPath={opts?.registryPath} />);
  await waitUntilExit();
}
