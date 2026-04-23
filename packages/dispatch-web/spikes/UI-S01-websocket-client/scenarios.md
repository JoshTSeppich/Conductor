# UI-S01 scenario log

Run at: 2026-04-23T16:12:47.272Z

## S1 — PASS

transient WS drop recovered, both events delivered

```
after emit e1: received=1 status=connected
after closeAllWs: status=connecting dropped=true
after reconnect wait: status=connected reconnected=true
after emit e2: received=2
```

## S2 — PASS

gap-fill delivered all 5 missed events, no duplicates

```
initial: received=1 lastTs=2026-04-23T16:12:39.644Z
emitted e2..e6 while disconnected: fixtureLog=6
after reconnect+gapfill: received=6 status=connected
unique timestamps in received: 6
```

## S3' — PASS

programmatic-disconnect proxy: gap-fill reconciled 4 missed events

```
initial: received=1
after disconnect: status=idle
emitted e2..e5 while client disconnected
after reconnect: received=5 status=connected
```

## S4a — PASS

backoff curve shape matches operator-acked numbers across 8 attempt levels

```
attempt=0 target=1000ms bounds=[750..1250] observed=[751..1250] mean=991
attempt=1 target=2000ms bounds=[1500..2500] observed=[1501..2500] mean=2009
attempt=2 target=4000ms bounds=[3000..5000] observed=[3001..4997] mean=3963
attempt=3 target=8000ms bounds=[6000..10000] observed=[6008..9998] mean=7918
attempt=4 target=16000ms bounds=[12000..20000] observed=[12000..19997] mean=15933
attempt=5 target=30000ms bounds=[22500..37500] observed=[22513..37499] mean=29919
attempt=6 target=30000ms bounds=[22500..37500] observed=[22553..37464] mean=30029
attempt=7 target=30000ms bounds=[22500..37500] observed=[22512..37487] mean=29926
```

## S4b — PASS

online scheduler observed delays match compute() within jitter

```
observed 5 backoff attempts:
  attempt=0 target=200ms bounds=[150..250] got=239ms OK
  attempt=1 target=400ms bounds=[300..500] got=449ms OK
  attempt=2 target=800ms bounds=[600..1000] got=643ms OK
  attempt=3 target=1000ms bounds=[750..1250] got=1172ms OK
  attempt=4 target=1000ms bounds=[750..1250] got=1127ms OK
scaling note: spike used base=200/cap=1000 for runtime; production 1000/30000 has identical shape
```

## S5 — PASS

dedupe caught both since= and replayAllOnConnect redeliveries

```
initial: received=2
after reconnect+replay: received=2 reconnected=true
```

## S6a — PASS

preflight-step-1 failure surfaced as daemon_down, no WS opened

```
status=daemon_down attempts=1 statuses=connecting,daemon_down
```

## S6b — PASS

preflight-step-2 401 stopped retries; no WS opened

```
status=auth_failed attempts=0 statuses=connecting,auth_failed
after 1.5s wait: attempts=0 (expect unchanged at 0)
```

## S6c — PASS

preflight passed, WS opened, event delivered

```
status=connected connected=true
```

## Summary
9/9 scenarios passed