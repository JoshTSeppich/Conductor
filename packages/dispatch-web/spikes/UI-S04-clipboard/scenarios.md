# UI-S04 scenario log

Run at: 2026-04-23T16:27:28.899Z

## S1 — PASS

pbcopy/pbpaste round-trip works

```
wrote "foo", read "foo"
```

## S2 — PASS

last-writer-wins confirmed; no coordination between writers

```
after daemon write: "daemon-handoff-v1"
after web-ui write 50ms later: "webui-handoff-v1"
```

## S3 — PASS

race result = one of {A, B}; result this run = concurrent-B. Not predictable across runs.

```
two pbcopy processes spawned simultaneously: "concurrent-A" and "concurrent-B"
clipboard after both complete: "concurrent-B"
```

## S4 — PASS

hazard chars round-trip byte-identical (triple-backticks, $vars, nested quotes, unicode, newlines)

```
wrote 152 bytes of hazard content
read back 152 bytes
```

## Summary
4/4 scenarios passed