#!/usr/bin/env bash
# MB-S06 PTY harness — run all experiments and re-record results.
#
# Each experiment writes results/expN-*.json. Re-running OVERWRITES.
# Run from repo root so node finds workspace's `ws` dependency.

set -e

cd "$(dirname "$0")/../../../../.."   # → repo root

for exp in exp1-bytes-integrity exp2-backpressure exp3-signal-forwarding \
           exp4-ring-buffer exp5-ws-reconnection exp6-multi-consumer; do
  echo "=== running $exp ==="
  node "packages/dispatch-daemon/spikes/MB-S06/pty-harness/$exp.mjs"
done

echo "=== all experiments complete ==="
ls -la packages/dispatch-daemon/spikes/MB-S06/pty-harness/results/
