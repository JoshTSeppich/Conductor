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
      <StateControlCluster session={data} name={focusedName} />
      <div className="flex gap-2 mt-2">
        <SendButton session={data} />
        <PullButton session={data} />
      </div>
    </div>,
  );
}
