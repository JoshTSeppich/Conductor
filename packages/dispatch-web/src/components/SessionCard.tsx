import type { ReactNode, KeyboardEvent } from 'react';
import type {
  SessionResponseV2Type,
  State,
} from 'dispatch-core/src/v2/schema.js';
import { formatAge } from '../utils/format-age.js';

// formatAge re-exported for consumers that imported from here pre-T12.
// New consumers should import from '../utils/format-age.js' directly.
export { formatAge };

// Ported from status.tsx:98-105. Returns the most-recent action
// timestamp (last_prompt_sent_at or last_handoff_pulled_at), or
// null when neither is set (fresh session).
function latestActionMs(session: SessionResponseV2Type): number | null {
  const candidates: number[] = [];
  if (session.last_prompt_sent_at !== null) {
    candidates.push(Date.parse(session.last_prompt_sent_at));
  }
  if (session.last_handoff_pulled_at !== null) {
    candidates.push(Date.parse(session.last_handoff_pulled_at));
  }
  return candidates.length === 0 ? null : Math.max(...candidates);
}

// Per gate ack Decision 3: state badge colors via built-in Tailwind
// palette. Semantic-conventional; doesn't share v1-continuity load-
// bearing weight of the 4 computed_status oklch tokens (T07).
const STATE_BADGE_CLASSES: Record<State, string> = {
  armed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  paused:
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  held: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  killed:
    'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

// computed_status accent: left border tint via T07 oklch tokens.
const COMPUTED_STATUS_TINT_CLASSES: Record<string, string> = {
  awaiting_review: 'border-l-status-awaiting-review',
  stale: 'border-l-status-stale',
  running: 'border-l-status-running',
  idle: 'border-l-status-idle',
};

export interface SessionCardProps {
  name: string;
  session: SessionResponseV2Type;
  onClick?: () => void;
}

// Minimal-view card per WEB-T10. T11 supplies real onClick callback
// via useFocusFromHash() hook. Between T10 ship and T11 ship, cards
// render but don't respond to clicks (no onClick passed). Intentional
// layer separation.
export function SessionCard({
  name,
  session,
  onClick,
}: SessionCardProps): ReactNode {
  const ageMs = latestActionMs(session);
  // null age (fresh session, no prompts/pulls yet) → em dash per
  // operator's weak preference. Lighter than "never"; universal
  // no-data glyph.
  const ageText = ageMs === null ? '—' : formatAge(Date.now() - ageMs);
  const stateBadge = STATE_BADGE_CLASSES[session.state];
  const computedTint =
    COMPUTED_STATUS_TINT_CLASSES[session.computed_status] ?? '';

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={name}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`p-2 bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 border-l-4 ${computedTint} cursor-pointer focus:outline focus:outline-2 focus:outline-blue-500`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">{name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${stateBadge}`}>
          {session.state.toUpperCase()}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
        <span className="truncate">{session.tmux_target}</span>
        <span>{ageText}</span>
      </div>
    </div>
  );
}
