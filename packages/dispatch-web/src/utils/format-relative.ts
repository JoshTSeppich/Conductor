import { formatAge } from './format-age.js';

// T20 helper. Wraps formatAge by appending " ago" suffix per
// TICKETS.md §WEB-T20 verbatim ("Human-readable timestamps
// (relative: '3m ago')"). Pattern note from format-age.ts: lift to
// dispatch-core when 2nd consumer surfaces (CLI ticker, menubar,
// etc.) — at present TickerRow is sole consumer; live here.
export function formatRelativeTime(ms: number): string {
  return `${formatAge(ms)} ago`;
}
