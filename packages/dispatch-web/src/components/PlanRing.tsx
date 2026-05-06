import type { ReactNode } from 'react';

// Phase 2 Step 3 (parallel-batch-2 / sess-1/dispatch-web-ui).
// Wireframe variant C header primitive: circular usage % + reset
// countdown. Pure presentational; mock-data is sourced from Layout,
// with data-mock="true" on this root as the per-field marker
// (sess-b finding #140 §Followups #2, closed by sess-e batch-5).

export interface PlanRingProps {
  usagePct: number;
  resetMs: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatReset(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return '<1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PlanRing({ usagePct, resetMs }: PlanRingProps): ReactNode {
  const pct = clamp(Math.round(usagePct), 0, 100);
  const dashOffset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div data-mock="true" data-testid="header-plan-ring" className="flex items-center gap-2 text-xs">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Plan usage"
        className="relative w-9 h-9 flex items-center justify-center"
      >
        <svg width="36" height="36" className="-rotate-90">
          <circle
            cx="18"
            cy="18"
            r={RADIUS}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="18"
            cy="18"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[9px] font-semibold">{pct}%</span>
      </div>
      <span className="text-gray-500 dark:text-gray-400">
        resets in {formatReset(resetMs)}
      </span>
    </div>
  );
}
