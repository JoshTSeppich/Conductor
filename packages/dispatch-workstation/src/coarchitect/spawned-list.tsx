// MB-T21 WB1 (red) — SpawnedList skeleton.
// Operator-acked Q-MBT21-3=b (sentinel-marker parse for spawned: [...] blocks) +
// Q-MBT21-12=a (inline styles).
//
// Contract surface (probe-06 will assert):
//   - When sessions is undefined/empty → render nothing
//   - Container ul data-testid="spawned-list" role="list"
//   - One li data-testid="spawned-session-${idx}" role="listitem" per session name
//   - Each li renders the session name text
//
// WB1 ships skeleton returning null so probes fail RED. WB4 implements
// the inline list render.

export interface SpawnedListProps {
  readonly sessions?: readonly string[] | null;
}

export function SpawnedList(_props: SpawnedListProps): JSX.Element | null {
  // WB1 red: return null → probe-06 testid lookups fail.
  return null;
}
