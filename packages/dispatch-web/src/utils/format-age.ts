// Ported from packages/dispatch-cli/src/commands/status.tsx:88-96.
// Extracted to dispatch-web's src/utils/ at WEB-T12 per pattern note:
// 2nd consumer (FocusedDetailPanel) introduced; lift from SessionCard
// to shared local utility. Lift to dispatch-core when CLI also needs
// the same helper post-Phase-Y.
export function formatAge(ms: number): string {
  if (ms < 60_000) return '<1m';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
