import type { ReactNode } from 'react';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';
import { useSession } from '../query/useSession.js';
import { formatAge } from '../utils/format-age.js';
import { StateControlCluster } from './StateControlCluster.js';
import { SendButton } from './SendButton.js';
import { PullButton } from './PullButton.js';

const PLACEHOLDER = 'Click a session card';
const LOADING = 'Loading session details…';
const ERROR = "Couldn't load session details";
const DASH = '—';

// Mock constants per operator Q3 / Q7 arbitration: inline (matches
// Layout.tsx:22-24 MOCK_USAGE_PCT precedent); per-field data-mock="true"
// markers on each wrapper (operator Q6 — accept divergence from
// Layout.tsx's cluster-wrapper pattern; gives test surface to assert
// each mock independently). Daemon does not expose model / plan /
// cost / stdout fields on SessionResponseV2 (verified Phase 1 §2
// against schema.ts:86-98 + L264-268). A followup finding will track
// real-data plumbing if/when daemon surfaces these.
const MOCK_MODEL_LABEL = 'claude-opus-4-7';
const MOCK_PLAN_SUMMARY = 'usage 47% • resets in 2h 14m';
const MOCK_COST_SUMMARY = '$0.42 today • $3.17 this week';
// Plausible CC-session-output style (Q3 arbitration). data-mock="true"
// on the wrapper is the dev-tools fake-marker; visual plausibility is
// the design goal so layout testing reflects realistic line lengths.
const MOCK_STDOUT_LINES: readonly string[] = [
  '[12:34:56] cc: applied edit FocusedDetailPanel.tsx:130-150',
  '[12:34:57] vitest run test/focused-detail.test.tsx',
  '[12:34:58] ✓ 8 tests passed',
  '[12:34:59] tsc --noEmit packages/dispatch-web',
  '[12:35:00] git add packages/dispatch-web/src/components/FocusedDetailPanel.tsx',
  '[12:35:01] git commit -m "green(MB-F-DETAIL-PANE): WB3 — mock field renderers"',
  '[12:35:02] git push origin sess-b/detail-pane-rearb',
  '[12:35:03] cc: handoff written /test/HANDOFF.md',
  '[12:35:04] cc: status_json updated phase=mock-fields-shipped',
  '[12:35:05] cc: idle, awaiting next prompt',
];

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

function formatLastActivity(session: SessionResponseV2Type): string {
  const ms = latestActionMs(session);
  return ms === null ? DASH : formatAge(Date.now() - ms);
}

function Row({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}): ReactNode {
  return (
    <div
      data-testid={testId}
      className="flex justify-between gap-4 py-1 border-b border-gray-200 dark:border-gray-800 text-sm"
    >
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}

// Plan / Cost mock rows mirror Row's flex layout but the wrapper
// div is the test surface (data-mock="true" + data-testid). Inlined
// rather than wrapping <Row> to avoid duplicate-testid lookup hazard
// (Row's internal data-testid would collide with the wrapper's).
function MockSummaryRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}): ReactNode {
  return (
    <div
      data-mock="true"
      data-testid={testId}
      className="flex justify-between gap-4 py-1 border-b border-gray-200 dark:border-gray-800 text-sm"
    >
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}

export function FocusedDetailPanel(): ReactNode {
  const focusedName = useUIStore((s) => s.focusedSessionName);
  // useSession with empty name is disabled (T04 enabled: name.length > 0)
  const { data, isLoading, isError } = useSession(focusedName ?? '');

  // Common section wrapper preserves Layout's role=region + aria-label
  // (T06 contract); content swaps based on state.
  const wrap = (content: ReactNode) => (
    <section
      role="region"
      aria-label="Session detail"
      className="overflow-auto p-3"
    >
      {content}
    </section>
  );

  if (focusedName === null) {
    return wrap(<p className="text-gray-500 dark:text-gray-400">{PLACEHOLDER}</p>);
  }

  if (isLoading) {
    return wrap(
      <p className="text-gray-500 dark:text-gray-400">{LOADING}</p>,
    );
  }

  if (isError || !data) {
    return wrap(
      <p className="text-red-600 dark:text-red-400">{ERROR}</p>,
    );
  }

  return wrap(
    <div className="flex flex-col">
      <h2 className="text-base font-bold mb-2">{focusedName}</h2>
      <div className="mb-2">
        <span
          data-mock="true"
          data-testid="detail-row-model"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs"
        >
          <span className="text-gray-500 dark:text-gray-400 uppercase">
            Model
          </span>
          <span className="font-medium">{MOCK_MODEL_LABEL}</span>
        </span>
      </div>
      <Row
        label="Status"
        value={data.computed_status}
        testId="detail-row-status"
      />
      <Row
        label="Last activity"
        value={formatLastActivity(data)}
        testId="detail-row-last-activity"
      />
      <MockSummaryRow
        label="Plan"
        value={MOCK_PLAN_SUMMARY}
        testId="detail-row-plan"
      />
      <MockSummaryRow
        label="Cost"
        value={MOCK_COST_SUMMARY}
        testId="detail-row-cost"
      />
      <div
        data-mock="true"
        data-testid="detail-stdout-snippet"
        className="mt-2"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
          Recent stdout
        </span>
        <pre className="text-xs whitespace-pre overflow-x-auto bg-gray-50 dark:bg-gray-900 rounded p-2 mt-1">
          {MOCK_STDOUT_LINES.join('\n')}
        </pre>
      </div>
      <StateControlCluster session={data} name={focusedName} />
      <div className="flex gap-2 mt-2">
        <SendButton session={data} />
        <PullButton session={data} />
      </div>
    </div>,
  );
}
