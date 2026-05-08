// MB-T21 WB4 (green) — SpawnedList implementation.
// Operator-acked Q-MBT21-3=b (sentinel-marker parse for spawned: blocks) +
// Q-MBT21-12=a (inline styles).
//
// Visual: tight unordered list of session names rendered inline below the
// assistant bubble that emitted the spawned: marker. Tagged with a small
// "spawned" prefix to make context legible.
//
// Contract surface (probe-06):
//   - sessions=undefined or [] → render nothing
//   - sessions=[..1+ strings] → render <ul data-testid="spawned-list"
//     role="list"> containing one <li data-testid="spawned-session-${idx}"
//     role="listitem"> per session name. Each li renders the session name.

export interface SpawnedListProps {
  readonly sessions?: readonly string[] | null;
}

export function SpawnedList({ sessions }: SpawnedListProps): JSX.Element | null {
  if (!sessions || sessions.length === 0) return null;
  return (
    <ul
      data-testid="spawned-list"
      role="list"
      style={{
        listStyle: 'none',
        margin: '4px 4px 4px 36px',
        padding: '6px 10px',
        alignSelf: 'flex-start',
        maxWidth: '85%',
        background: '#0b1320',
        border: '1px solid #1f2937',
        borderRadius: 8,
        fontSize: 12,
        color: '#9ca3af',
        fontFamily:
          'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
      }}
    >
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: '#6b7280',
          marginBottom: 4,
          display: 'block',
        }}
      >
        spawned
      </span>
      {sessions.map((name, idx) => (
        <li
          key={idx}
          data-testid={`spawned-session-${idx}`}
          role="listitem"
          style={{
            padding: '2px 0',
            color: '#e5e7eb',
          }}
        >
          {name}
        </li>
      ))}
    </ul>
  );
}
