# UI-S03 scenario log

Run at: 2026-04-23T17:53:24.617Z

## S1 — PASS

Node child_process → osascript pipeline works; stdout round-trips

```
osascript -e 'return 42' → stdout "42", stderr ""
```

## S2 — PASS

osascript surfaces syntax errors to stderr; production click handler can log + fall back to open(URL)

```
exit code: 1
stderr: "12:29: syntax error: A property can’t go after this identifier. (-2740)"
```

## S3 — PASS

macOS `open` command resolvable; fallback path (production-recommended) viable

```
which open → "/usr/bin/open"
```

## Scope note

Runnable scenarios above verify the Node→osascript pipeline and
the macOS `open` command availability. The production click-handler
pattern, per-browser AppleScript incantations, fallback behavior,
and failure-mode taxonomy live in `docs/adr/UI-S03-notification-click.md`
as text — these are not executed here because running them would
launch browsers on the operator's desktop without consent.

## Summary
3/3 runnable scenarios passed